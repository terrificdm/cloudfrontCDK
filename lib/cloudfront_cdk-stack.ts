import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as lambda from '@aws-cdk/aws-lambda';

export class CloudfrontCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /* Create a S3 bucket to hold flask static content as well as flask program for EC2 to download and run */
    const assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // S3 bucket auto-deletion when using "cdk destroy" command
      autoDeleteObjects: true
    });
    
    new s3deploy.BucketDeployment(this, 'StaticAssets', {
      sources: [s3deploy.Source.asset('./flask-demo')],
      destinationBucket: assetsBucket,
    });
    
    new cdk.CfnOutput(this, 'BucketConsole', {
      value: 'https://console.aws.amazon.com/s3/buckets/'+assetsBucket.bucketName,
      description: 'The AWS console for specific S3 bucket'
    });
    new cdk.CfnOutput(this, 'BucketName', {
      value: assetsBucket.bucketName,
      description: 'The S3 bucket for storing static content of flask app'
    });
    
    /* Create an EC2 to run flask program which generates the dynamic content */ 
    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {isDefault: true,});
    
    const amznLinux = ec2.MachineImage.latestAmazonLinux({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2
    });
    
    const iam_role = new iam.Role(this, 'InstanceReadS3', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    });
    iam_role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'));
    
    const instance = new ec2.Instance(this, 'Instance',{
      vpc: vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: amznLinux,
      keyName:'demo', // you need to modify the key_name with your key-pairs name!
      role: iam_role
    });
    
    instance.userData.addS3DownloadCommand({
      bucket:assetsBucket,
      bucketKey: 'flask.zip'
    });
    
    instance.userData.addS3DownloadCommand({
      bucket:assetsBucket,
      bucketKey: 'start.sh'
    });
    
    instance.userData.addCommands('cd /tmp && chmod +x start.sh && ./start.sh');
    
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
    const s3Origin = assetsBucket
    
    /* Example 1: Creat a stand CF distribution with 2 behaviors which use above EC2 and S3 as origins */
    // const distribution = new cloudfront.Distribution(this, 'myDist', {
    //   defaultBehavior: {
    //     origin: new origins.HttpOrigin(httpOrigin,{
    //       protocolPolicy:cloudfront.OriginProtocolPolicy.HTTP_ONLY
    //     }),
    //     viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    //     cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED
    //   },
    //   additionalBehaviors: {
    //     '/static/*': {
    //       origin: new origins.S3Origin(s3Origin),
    //       viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    //       cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
    //     }
    //   }
    // });
    
    /* Example 2: Create a L@E function and a CF distribution, then associate the L@E function to a specific behavior of CF distribution */
    // const customCachePolicy = new cloudfront.CachePolicy(this, 'customCachePolicy', {
    //   cachePolicyName: 'customCachePolicy-Lambda',
    //   comment: 'Lambda will modify the TTL via "cache-control" header',
    //   defaultTtl: cdk.Duration.seconds(0), 
    //   minTtl: cdk.Duration.seconds(0),
    //   maxTtl:cdk.Duration.seconds(3600),
    //   enableAcceptEncodingBrotli: true,
    //   enableAcceptEncodingGzip: true,
    //   headerBehavior: cloudfront.CacheHeaderBehavior.allowList('CloudFront-Viewer-Country')
    // }); // Create a custom cache policy reserved for L@E
    
    // const customOriginRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'customOriginRequestPolicy', {
    //   originRequestPolicyName: 'customOriginRequestPolicy-Lambda',
    //   comment: 'Pass the "CloudFront-Viewer-Country" header to origin',
    //   headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList('CloudFront-Viewer-Country')
    // }); // Create a custom origin request policy reserved for L@E
    
    // const lambdaFunc = new lambda.Function(this, 'LambdaFunction', {
    //   runtime: lambda.Runtime.NODEJS_14_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset('./functions/lambda')
    // });
    
    // const distribution = new cloudfront.Distribution(this, 'myDist', {
    //   defaultBehavior: {
    //     origin: new origins.HttpOrigin(httpOrigin,{
    //       protocolPolicy:cloudfront.OriginProtocolPolicy.HTTP_ONLY
    //     }),
    //     viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    //     cachePolicy: customCachePolicy,
    //     originRequestPolicy: customOriginRequestPolicy,
    //     edgeLambdas: [{
    //       functionVersion: lambdaFunc.currentVersion,
    //       eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST
    //     }]
    //   },
    //   additionalBehaviors: {
    //     '/static/*': {
    //       origin: new origins.S3Origin(s3Origin),
    //       viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    //       cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
    //     }
    //   }
    // });
    
    /* Example 3: Create a CF function, L@E function and a CF distribution, then associate them to a specific behavior of CF distribution */
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
    
    const cfFunc = new cloudfront.Function(this, 'CFFunction', {
      code: cloudfront.FunctionCode.fromFile({filePath: './functions/cffunc/cffunc.js'})
    })
    
    const lambdaFunc = new lambda.Function(this, 'LambdaFunction', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./functions/lambda')
    });
    
    const distribution = new cloudfront.Distribution(this, 'myDist', {
      defaultBehavior: {
        origin: new origins.HttpOrigin(httpOrigin,{
          protocolPolicy:cloudfront.OriginProtocolPolicy.HTTP_ONLY
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: customCachePolicy,
        originRequestPolicy: customOriginRequestPolicy,
        edgeLambdas: [{
          functionVersion: lambdaFunc.currentVersion,
          eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST
        }],
        functionAssociations:[{
          function: cfFunc,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST
        }]
      },
      additionalBehaviors: {
        '/static/*': {
          origin: new origins.S3Origin(s3Origin),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
        }
      }
    });
    
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
