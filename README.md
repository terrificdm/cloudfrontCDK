# CloudFront CDK Deployment  
This is a project for using CDK TypeScript to deploy CloudFront with Lambda@Edge and CloudFront Functions for a Flask website which consists of static content as well as dynamic content.  
* For demonstrate L@E, you should access CF domain name from JP.  
* For demonstrate CFF, you should access CF domain name from CN.  
* For accessing from other counties, there will be a normal Flask website(without triggering L@E and CFF).
> 3 scenarios covered from codes in lib folder: Example 1) No L@E and CFF, just an ordinary CF distribution; Example 2) A L@E function is associated with CF; Example 3) A CFF and a L@E function are associated with CF  

> The L@E and CFF will be functional basing on "CloudFront-Viewer-Country" header, and you can change with other country codes which you like via modifying function codes.  

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
