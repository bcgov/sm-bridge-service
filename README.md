# SiteMinder to JWT Authentication Bridge
A fancy title, simply service.  

This microservice basics converts a SiteMinder SSO session to a [JWT](https://jwt.io).

This is intended as a stop-gap measure until an OpenID Connect service is offered. 

## How it works

![Image of Sequence Diagram](/docs/sequence_diagram.png)


## How to Implement

You'll need the following, recommended order to get started but they can be parallel:

1. Engage with IDIM to onboard to BCeID
1. You'll need TWO domains, one like mydomain.com and another just for login purposes, login.mydomain.com.  Both will require certficiates for HTTPS (TLS 1.1+).
1. Order the SiteMinder Reverse Proxy service for the login.mydomain.com.  Do NOT order mydomain.com SiteMinder reverse proxy service.
1. Install on this service on OpenShift
1. Integrate your UI app
1. Integrate your API app

## Installing on OpenShift

TODO: provide templates

## Integrate your UI app

TODO: describe integration

## Integrate your API app

TODO: describe integration

# Developers

Most will just use this service out-of-the-box but if you wanted to contribute or tweak for your needs, continue reading.

## Development Environment


