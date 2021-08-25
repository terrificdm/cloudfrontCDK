# CloudFront CDK Deployment  
This is an example for using CDK TypeScript to deploy CloudFront with Lambda@Edge and CloudFront Functions for a Flask website which consists of static content as well as dynamic content.  
* For demonstrate L@E, you should access CF domain name from JP.  
* For demonstrate CFF, you should access CF domain name from CN.  
* For accessing from other countries, there will be a normal Flask website(without triggering L@E and CFF).
> There are 3 scenarios covered from codes in lib folder: Example 1) No L@E and CFF, just an ordinary CF distribution; Example 2) A L@E function is associated with CF; Example 3) Both the CFF and a L@E function are associated with CF.  

> The L@E and CFF will be functional basing on "CloudFront-Viewer-Country" header, and you can change with other country codes which you like via modifying function codes.  

> If you want to decouple the deployment for Application(Infra) layer and CloudFront layer, pls refer to this [repo](https://github.com/terrificdm/CloufrontCdkDemo).  

> Since the L@E is required to be deployed in us-east-1, all of resources of this example are deployed in us-east-1 for easy demonstration.

# Build
* Make sure you follow the [AWS CDK Prerequisites](https://docs.aws.amazon.com/cdk/latest/guide/work-with.html#work-with-prerequisites) before you build the project.
* Clone this project and change the directory to the root folder of the project, and run below commands:
```bash
$ npm install -g aws-cdk
$ npm install  
$ cdk bootstrap
```

# Deploy  
* Run commands as below:
```bash
$ cdk synth
$ cdk deploy
```
