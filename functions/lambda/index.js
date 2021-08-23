// Lambda@Edge example: generate a webpage basing on "CloudFront-Viewer-Country" header
'use strict';
exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;
    const headers = request.headers;

    if (
        headers['cloudfront-viewer-country'] &&
        headers['cloudfront-viewer-country'][0].value
    ) {
        const countryCode = headers['cloudfront-viewer-country'][0].value;
        console.log('countryCode', countryCode);
        if (
            countryCode == 'JP' // Choose a country code
            ) {
                const date = new Date((new Date()).getTime());
                const Y = date.getFullYear() + '-';
                const M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1) + '-';
                const D = (date.getDate() < 10 ? '0'+date.getDate() : date.getDate()) + ' ';
                const h = (date.getHours() < 10 ? '0'+date.getHours() : date.getHours()) + ':';
                const m = (date.getMinutes() < 10 ? '0'+date.getMinutes() : date.getMinutes()) + ':';
                const s = (date.getSeconds() < 10 ? '0'+date.getSeconds() : date.getSeconds());
                const time = Y+M+D+h+m+s;
                const response = {
                    status: '200',
                    statusDescription: 'OK',
                    headers: {
                        'cloudfront-viewer-country': [
                            {
                                key: 'CloudFront-Viewer-Country',
                                value: countryCode,
                            },
                        ],
                        'cache-control': [
                            {
                                key: 'Cache-Control',
                                value: 'max-age=3600',
                            },
                        ],
                        'content-type': [
                            {
                                key: 'Content-Type',
                                value: 'text/html',
                            },
                        ],
                        'content-encoding': [
                            {
                                key: 'Content-Encoding',
                                value: 'UTF-8',
                            },
                        ],
                    },
                    body: `
                    <!DOCTYPE html />
                        <html lang="en">
                        <head>
                            <meta charset="utf-8">
                            <title>Lambda@Edge Demo</title>
                            <style typr="text/css">
                            body {margin-top: 120px; background-color: #414042;}
                            .container {
                                display: flex;
                                justify-content: center;
                            }
                            .item {
                                border-radius: .5em;
                                padding: 60px;
                                width: 30em;
                                height: 140px;
                                background-color: #2a323b;
                                color: #edf0f5
                            }
                            strong {
                                color: #FF9900;
                            }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="item">
                                    <h1>Lambda@Edge Demo</h1>
                                    <p>You are coming from <strong>${countryCode}</strong> to access this website.</p>
                                    <p style="font-size:12px;color:#7F7F7F">Note: this webpage is generated by Lambda@Edge</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `,
                };
                callback(null, response);
              }
              callback(null, request);
      }
      callback(null, request);
};