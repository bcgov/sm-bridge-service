# SiteMinder to JWT Authentication Bridge
A fancy title, simple service.  

This microservice basics converts a SiteMinder SSO session to a [JWT](https://jwt.io) so you can secure your UI app and 
APIs. As you may know (because you're here), single page applications (Angular, React) or mobile app either cannot or 
with great difficult use proxy based authentication service like SiteMinder.

## How it works

![Image of Sequence Diagram](/docs/sequence_diagram.png)

## How it's secured

If you're running on an environment that can control the traffic, then just firewall this service to only listen to SiteMinder's 
reverse proxy service.  

If you're running on OpenShift where all internet traffic is allow here's how it's secured:

1. DNS A record resolves to SiteMinder Reverse Proxy
1. SiteMinder engages and logins in the user etc
1. HTTP request is forwarded to OpenShift's HA Proxy (technically it goes thru a load balancer buts its transparent for our concerns)
1. OpenShift's HA Proxy read the HTTP `host` header and matches with our `route`
1. HA Proxy also appends the IP address of SiteMinder Reverse Proxy to `x-forwarded-for`
1. SM Bridge Service "trusts" HA Proxy to append `x-forwarded-for` correctly (which it does)
1. SM Bridge Service will only allow the IP addresses of SiteMinder Reverse Proxy denying all other traffic
 
You must use HTTPS between the browser and SiteMinder Reverse Proxy AND between SiteMinder Reverse Proxy and OpenShift.  
The `route` in OpenShift can `edge` terminate the TLS. 

## OAuth2/OIDC Similarities and Differences 

This is intended as a stop-gap measure until an OpenID Connect service is offered.  It's based on OAuth2 Implicit Grant
but simplified for a single tenant (one key) and flow. Conceptually, a conversion to OpenID Connect or OAuth2 isn't great leap. 

Terms:

- SM Bridge Service = Authorization Server
- UI App = Client Application
- API App = Resource Service

Comparison:
- Only Implicit Grant with JWT supported
- Required request parameters: `nonce=<large secure random value>`
- Ignored request parameters: `response_type`, `client_id` ,`redirect_uri`, `scope`
- Only these parameters are returned: `access_token` (no refresh tokens provided), `nonce` in ID Token
- Returned JWT is an [ODIC ID Token](http://openid.net/specs/openid-connect-core-1_0.html#IDToken)
- No refresh tokens provided
- No revocation of tokens

## How to Implement

You'll need the following, recommended order to get started but they can be parallel:

1. Engage with IDIM to onboard to BCeID
1. You'll need TWO domains, one like mydomain.com and another just for login purposes, login.mydomain.com.  Both will require certficiates for HTTPS (TLS 1.1+).
1. Order the SiteMinder Reverse Proxy service for the login.mydomain.com.  Do NOT order mydomain.com SiteMinder reverse proxy service.
1. Install on this service on OpenShift
1. Integrate your UI app 
1. Integrate your API app

## Installing SM Bridge Service on OpenShift

OpenShift is not required and you can deploy this to any host that supports NodeJS v4+.  If you happen to use OpenShift 
we've given you some templates to get started quickly!

Browse to `openshift` directory for details on setup and deployments.  

### Configuration
The application does not have a configuration file, rather you provide configuration via the operating systems environments variables.  This allows for easy configuration management in a container environment.

Environment Variable Name | Description | Default Value
------------ | ------------- | -------------
ISSUER | The name of the issuer of the token | `http://localhost:8080`, value must be provided for production e.g., `https://login.mydomain.com`
REDIRECT_URI | Normally provided by the client in OAuth2 implicit grant flow, however since we're single tenant you just configure the endpoint where you want this service to return to the browser to, e.g., `https://mydomain.com` | `http://localhost:9090`, value must be provided for production e.g., `https://mydomain.com` 
TOKEN_EXPIRY | How long is the token considered valid in minutes | `60` (minutes) 
SECRET | The secret key for signing and validating the token, must be base64 encoded, use `node gensecret.js > secret.txt` to securely generate a new key, use a different one per environment | Defaults to a "hard-coded" key, value must be provided in production 
SERVICE_IP | Which IP address for this service to listen on the host | `0.0.0.0` (all adaptors)
SERVICE_PORT | Which port to listen on | `8080` for running NodeJS as non-root
USE_TRUST_PROXY | Enables security controls to determine which proxy can be trusted.  For example, OpenShift's HA Proxy and WAM's Reverse Proxy.  Defaults to true, you may disable ONLY IF you can ensure no traffic can hit this service without going thru the reverse proxy which is not the case in BC Governments deployment of OpenShift. | `true`
TRUST_PROXY | Which IP addresses or CIDR can be trusted. For multiple addresses, separate with a comma.  [More info](https://expressjs.com/en/guide/behind-proxies.html) | `172.16.0.0/12`
SITEMINDER_PROXY | Which IP address or CIDR is the SiteMinder Reverse Proxy Servers, all other address will be denied | none
SERVICE_PORT | Which port to listen on | `8080` for running NodeJS as non-root
LOG_LEVEL | How chatty do you want to logging to be. Values can be (in order of chattyness) `debug` `info` `error`. | `debug`   

If NodeJS detects it's running in production and missing required configuration, NodeJS will terminate the process, `exit 1`.

#### Header Mapping 
By default this service will map these properties, but you can change them via a **Base64 Encoded string** environment variable called `HEADER_MAPPER` so long as you follow the JSON syntax.  

```json
[
  {"incoming": "SMGOV_USERIDENTIFIER", "outgoing": "sub", "required": true},
  {"incoming": "SMGOV_USERTYPE", "outgoing": "userType", "required": true},
  {"incoming": "SMGOV_USERDISPLAYNAME", "outgoing": "name", "required": true},
  {"incoming": "SMGOV_EMAIL", "outgoing": "email", "required": false}
]
```


## Integrate your UI app

1. Redirect to /authorize?nonce=<yourvalue>
2. Redirect

URI encode your `nonce`


## Integrate your API app

1. HTTP Header `Authorization` the value `Bearer <token>`

## Access Token

Example [Required ID Token claims](http://openid.net/specs/openid-connect-core-1_0.html#IDToken) use for this bridge:

```
{
   "iss": "http://localhost:8080",
   "sub": "987987SKJSDKLJSKLDJKLM8907087987",
   "aud": "http://localhost:9090",
   "nonce": "654a654s8d7987320z",
   "exp": 1311281970,
   "iat": 1311280970,
   ... standard claims ...
   ... extension claims ... 
  }
```

Example additional [Standard Claims](http://openid.net/specs/openid-connect-core-1_0.html#StandardClaims) provided by this service:

```
{
    ... required claims ...
    "name": "Greg Turner"
    ... extension claims ...
}
```

ID Token specification allows for extensions, here's an example of the extentions


```
{
    ... required claims ...
    ... standard claims ...
    "user_type": "BUSINESS"
    "email": "bob@example.com"
}
```

### Full Example

Raw Encoded Token:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODAiLCJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjkwOTAiLCJub25jZSI6Ii9xanhYS0FyV2I0ZDRJNXhYalRqdHdodzZBUFk2T3VTVHk3VjFNZjRwYUE9IiwiaWF0IjoxNTAyMzk4NzE2LCJzdWIiOiI4OTEyM2hqMWtqMjM4OWFzamtkaGFqa3NkIiwidXNlcl90eXBlIjoiQlVTSU5FU1MiLCJuYW1lIjoiR3JlZ1xcIFR1cm5lciciLCJlbWFpbCI6IiIsImV4cCI6MTUwMjQwMjMxNn0.oUJ9QOYo4gWn0T9jARAzy0Jk-huG70xoFqUj7zuD_yA
```

Decoded Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

Decode Payload
```json
{
  "iss":"http://localhost:8080",
  "aud":"http://localhost:9090",
  "nonce":"XhUE/AgOG5hrNnO0JpYI1lvDtonKvflnOwH1YLUukpw=",
  "iat":1502398546,
  "sub":"89123hj1kj2389asjkdhajksd",
  "user_type":"BUSINESS",
  "name":"Greg\\ Turner'",
  "email":"example@example.com",
  "exp":1502402146
}
```



### Default Mapping from SiteMinder HTTP Headers

SiteMinder HTTP Header | Description | Mapped to ID Token Claim (JSON) | Always Provided
------------ | ------------- | ------------- | -------------
`SMGOV_USERIDENTIFIER` | A character string that uniquely identifies the user.   This is typically a 32 character string consisting of hexadecimal characters but may be tailored to the requirements of the relying party. | `sub` | yes
`SMGOV_USERTYPE` | The type of user that was authenticated.  Will have one of the following values: `BUSINESS`, `INDIVIDUAL`, `INTERNAL` | `user_type` | yes
`SMGOV_USERDISPLAYNAME` | The display name of the user that can be displayed on web pages | `name` | yes
`SMGOV_EMAIL` | The display email address of the user  | `email` | if available

# Developers

Most will just use this service out-of-the-box but if you wanted to contribute a feature, fix a bug or tweak for your needs, continue reading.

## Development Environment


