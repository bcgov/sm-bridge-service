# OpenShift and Jenkins Integration
This documentation provides you with step by step instructions on how to build and deploy this 
application in an OpenShift 3.3+ and Jenkins 2.x+ environment.  Jenkins is not required and you could 
just use the built-in OpenShift triggers.

## Overview
 
 In a nutshell, it allows you to build with one s2i image, i.e., NodeJS 6+, then use another image, i.e., nginx, for runtime.
 
 OpenShift is responsible for:
 - Building Docker images
 - Building S2I Images
 - Deployments
 
 Jenkins is responsible for:
 - Listening for pushes from GitHub SCM, i.e., GitHub hook -> Jenkins
 - Triggers the Build/Deploy Pipeline
 - Executing the `Jenkinsfile`
   - SCM checkout
   - Trigger OpenShift to build images
   - Tagging images to instruct OpenShift to deploy
 - Build notifications, repo tagging and other CI/CD goodies
 
 ## Setup Nodejs-6-Centos7
 
 This is your builder image that installs and runs the source code.
 
 This image is based on the OpenShift's community NodeJS 6 image, i.e., `FROM centos/nodejs-6-centos7`.
 
 To add this image to your OpenShift Project,
 1. Open OpenShift web console->Add to Project->Import YAML/JSON
 1. Paste `nodejs-6-centos7.json` into form -> Create
 1. Change the Git Repo URL to yours -> Create
 1. With the new build config, go to the Builds-> `nodejs-6-centos7` -> Start Build
 
 What happens in OpenShift:
 1. Fetches `Dockerfile` from `<your repo>/nodejs-6-centos7/Dockerfile`
 1. Executes Dockerfile build strategy
 1. Pushes new `nodejs-6-centos7` image into your project's Image Streams
 
 ## Setup SM Bridge Service Build
 
 To add this image to your OpenShift Project,
 1. Open OpenShift web console->Add to Project->Import YAML/JSON
 1. Paste `sm-bridge-service-build.json` into form -> Create
 1. Change the Git Repo URL to yours -> Create
 1. With the new build config, go to the Builds-> `sm-bridge-service-build` -> Start Build
 
 What happens in OpenShift:
 1. Fetches source from GitHub 
 1. `npm install`
 1. Pushes new `sm-bridge-service` image into your project's Image Streams
 
 ## Setup "Your App" Deployment
 
 Once we've got an image out of the `sm-bridge-service-build` builder, e.g., `<your app name>`, we
 need to setup the deployment.  We've provide a deployment template that is based on real load testing:
 1. Tuned CPU/Memory for the NodeJS runtime on containers
 1. Auto-scaling for high work loads
 1. Tweaked readiness and liveness probes settings
 
 The deployment template will create in OpenShift:
 1. Deployment config with default runtime env vars
 1. Service config
 1. Route config
 
 To add this image to your OpenShift Project,
 1. Open OpenShift web console->Add to Project->Import YAML/JSON
 1. Paste `sm-bridge-service-deploy` into form -> Create
 1. Setup configuration for the environment following directions for each variable
 1. This should auto trigger a build
 
 Repeat these steps for each environment you have changing the `Env TAG name`.
 
 ## Jenkins vs OpenShift Triggers
 
 You can choose not to use Jenkins at this point.  Instead, use vanilla OpenShift build triggers and image
 changes deployments.  However, Jenkins provides some nice features you'll probably need.
 
 ## Jenkins Install
 
 So, you've chosen to use Jenkins!  Congrats!
   
 This repo also comes with a `Jenkinsfile` to take advantage of the Pipelines feature in OpenShift and Jenkins.
 
 To add this image to your OpenShift Project,
  1. Open OpenShift web console->Add to Project->Import YAML/JSON
  1. Paste `jenkins-pipeline-build.json` into form -> Create
  1. Change the Git Repo URL to yours -> Create
  
  What happens in OpenShift:
  1. Fetches JenkinsFile from repo
  1. Creates Jenkins 2.x if doesn't already exist
  1. Creates a new Pipeline object in Jenkins synced with OpenShift
 
 ## Jenkins Additional Setup
 
 Jenkins out-of-the-box needs some additional setup.  
 
 1. First off, you'll need the admin password.  Go the Deployments -> `jenkins-pipeline-svc` -> Environment -> `JENKINS_PASSWORD`
 1. Navigate to jenkins web site by looking in your Routes in made for Jenkins
 1. Upgrade all the plugins in Jenkins
 1. Add GitHub webhook to GitHub from OpenShift Web Console->Pipelines->Edit <something>-pipeline->GitHub webhooks 
 
 ## Jenkins Manual Setup
 
 You can also create a Job in Jenkins and point your Job to the Jenkinsfile.   
 
 
