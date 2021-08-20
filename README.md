# CloudFront CDK Deployment  
This is a project for using CDK TypeScript to deploy CloudFront with Lambda@Edge and CloudFront Functions for a Flask website which consists of static content as well as dynamic content.  
* For demonstrate L@E, you shoule access CF domain name from JP.  
* For demonstrate CFF, you shoule access CF domain name from CN.  
* For accessing from other counties, there will be a normal Flask website.
> The L@E and CFF will be functional basing on "CloudFront-Viewer-Country" header, and you can change with other country code you like via function codes.  

# Build
```bash
$ npm install -g aws-cdk
$ npm install  
```

# Deploy  
```bash
$ cdk synth
$ ckd deploy
```
