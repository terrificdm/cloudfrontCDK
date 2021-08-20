#!/bin/bash
yum update -y
yum install pip -y
unzip flask.zip
pip install -r requirements.txt
nohup python app.py >/dev/null 2>&1 &
