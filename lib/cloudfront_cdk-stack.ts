import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import * as assets from '@aws-cdk/aws-s3-assets';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as lambda from '@aws-cdk/aws-lambda';

export class CloudfrontCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /* Create a S3 bucket to hold Flask website static content */
    const staticBucket = new s3.Bucket(this, 'AssetsBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // S3 bucket auto-deletion when using "cdk destroy" command
      autoDeleteObjects: true
    });
    
    new s3deploy.BucketDeployment(this, 'StaticAssets', {
      sources: [s3deploy.Source.asset('./flask-demo/static')],
      destinationBucket: staticBucket,
      destinationKeyPrefix: 'static'
    }); // Upload static content to S3 bucket for Flask website
    
    const appAssets = new assets.Asset(this, 'AppAssets', {
      path: './flask-demo/app'
    }); // Upload Flask app files as a zip file to assets bucket for EC2 to download and run

    
    new cdk.CfnOutput(this, 'BucketConsole', {
      value: 'https://console.aws.amazon.com/s3/buckets/'+staticBucket.bucketName,
      description: 'The AWS console for specific S3 bucket'
    });
    new cdk.CfnOutput(this, 'BucketName', {
      value: staticBucket.bucketName,
      description: 'The S3 bucket for storing static content of flask app'
    });
    
    /* Create an EC2 to run flask app which generates the dynamic content */ 
    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {isDefault: true,});
    
    const amznLinux = ec2.MachineImage.latestAmazonLinux({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2
    });
    
    const instance = new ec2.Instance(this, 'Instance',{
      vpc: vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: amznLinux,
      keyName:'demo' // You need to modify the value of keyName with your own key-pairs name!
    });
    
    appAssets.grantRead(instance.role);
    instance.userData.addS3DownloadCommand({
      bucket: appAssets.bucket,
      bucketKey: appAssets.s3ObjectKey,
      localFile: '/tmp/app.zip'
    });
    instance.userData.addCommands('cd /tmp && unzip -o app.zip && chmod +x start.sh && ./start.sh && rm /var/lib/cloud/instance/sem/config_scripts_user');
    
    instance.connections.allowFromAnyIpv4(ec2.Port.tcp(22), 'Allow ssh from internet');
    instance.connections.allowFromAnyIpv4(ec2.Port.tcp(80), 'Allow http from internet');
    
    new cdk.CfnOutput(this, 'InstanceConsole', {
      value: 'https://console.aws.amazon.com/ec2/home?region='+instance.env.region+'#Instances:search='+instance.instanceId,
      description: 'The AWS console for specific EC2 instance'
    });
    new cdk.CfnOutput(this, 'InstancePublicDNSName', {
      value: instance.instancePublicDnsName,
      description: 'The EC2 for running flask app which generates dynamic content'
    });
    
    const httpOrigin = instance.instancePublicDnsName;
    const s3Origin = staticBucket
    
    /* Example 1: Creat a stand CF distribution with 2 behaviors which use above EC2 and S3 as origins */
    const distribution = new cloudfront.Distribution(this, 'myDist', {
      defaultBehavior: {
        origin: new origins.HttpOrigin(httpOrigin,{
          protocolPolicy:cloudfront.OriginProtocolPolicy.HTTP_ONLY
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED
      },
      additionalBehaviors: {
        '/static/*': {
          origin: new origins.S3Origin(s3Origin),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
        }
      }
    });
    
    /* Example 2: Basing on Example 1, create a L@E function and a CF distribution, then associate the L@E function to a specific behavior of CF distribution */
    const customCachePolicy = new cloudfront.CachePolicy(this, 'customCachePolicy', {
      cachePolicyName: 'customCachePolicy-Lambda',
      comment: 'Lambda will modify the TTL via "cache-control" header',
      defaultTtl: cdk.Duration.seconds(0), 
      minTtl: cdk.Duration.seconds(0),
      maxTtl:cdk.Duration.seconds(3600),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList('CloudFront-Viewer-Country')
    }); // Create a custom cache policy reserved for L@E
    
    const customOriginRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'customOriginRequestPolicy', {
      originRequestPolicyName: 'customOriginRequestPolicy-Lambda',
      comment: 'Pass the "CloudFront-Viewer-Country" header to origin',
      headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList('CloudFront-Viewer-Country')
    }); // Create a custom origin request policy reserved for L@E
    
    // Create a iam role for L@E
    const edge_role = new iam.Role(this, 'EdgeRole', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('lambda.amazonaws.com'),
        new iam.ServicePrincipal('edgelambda.amazonaws.com')
      )
    });
    edge_role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')); 
    
    const lambdaFunc = new lambda.Function(this, 'LambdaFunction', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./functions/lambda'),
      role: edge_role
    });
 
    const dist = distribution.node.defaultChild as cloudfront.CfnDistribution;
    dist.addPropertyOverride('DistributionConfig.DefaultCacheBehavior.CachePolicyId', customCachePolicy.cachePolicyId);
    dist.addPropertyOverride('DistributionConfig.DefaultCacheBehavior.OriginRequestPolicyId', customOriginRequestPolicy.originRequestPolicyId);
    dist.addPropertyOverride('DistributionConfig.DefaultCacheBehavior.LambdaFunctionAssociations', [
      {
        EventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
        LambdaFunctionARN: lambdaFunc.currentVersion.edgeArn
      }
    ]);
   
    /* Example 3: Basing on Example 2, create a CF function and associate it to a specific behavior of CF distribution */
    const cfFunc = new cloudfront.Function(this, 'CFFunction', {
      code: cloudfront.FunctionCode.fromFile({filePath: './functions/cffunc/cffunc.js'})
    })
    
    dist.addPropertyOverride('DistributionConfig.DefaultCacheBehavior.FunctionAssociations', [
      {
        EventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        FunctionARN: cfFunc.functionArn
      }
    ]);
    
    new cdk.CfnOutput(this, 'CFDistributionConsole', {
      value: 'https://console.aws.amazon.com/cloudfront/v3/home?#/distributions/'+distribution.distributionId,
      description: 'The AWS console for specific CloudFront distribution'
    });
    new cdk.CfnOutput(this, 'CFDistributionDNSName', {
      value: distribution.domainName,
      description: 'The CloudFront distribution for flask app'
    });
    
  }
}
