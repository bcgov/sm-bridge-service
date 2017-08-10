# SiteMinder to JWT Authentication Bridge
A fancy title, simple service.  

This microservice basics converts a SiteMinder SSO session to a [JWT](https://jwt.io) so you can secure your UI app and 
APIs. As you may know (because you're here), single page applications (Angular, React) or mobile app either cannot or 
with great difficult use proxy based authentication service like SiteMinder.

## How it works

![Image of Sequence Diagram](/docs/sequence_diagram.png)

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

TODO: provide templates

### Configuration
The application does not have a configuration file, rather you provide configuration via the operating systems environments variables.  This allows for easy configuration management in a container environment.

Environment Variable Name | Description | Default Value
------------ | ------------- | -------------
ISSUER | The name of the issuer of the token | `http://localhost:8080`, value must be provided for production e.g., `https://login.mydomain.com`
REDIRECT_URI | Normally provided by the client in OAuth2 implicit grant flow, however since we're single tenant you just configure the endpoint where you want this service to return to the browser to, e.g., `https://mydomain.com` | `http://localhost:9090`, value must be provided for production e.g., `https://mydomain.com` 
TOKEN_EXPIRY | How long is the token considered valid in minutes | 0 to use`SM_TIMETOEXPIRE`, e.g., 2-4 hours.  If no `SM_TIMETOEXPIRE` is not available defaults to 1 hour
SECRET | The secret key for signing and validating the token, must be base64 encoded, use `node gensecret.js > secret.txt` to securely generate a new key, use a different one per environment | Defaults to a "hard-coded" key, value must be provided in production 
SERVICE_IP | Which IP address for this service to listen on the host | `0.0.0.0` (all adaptors)
SERVICE_PORT | Which port to listen on | `8080` for running NodeJS as non-root
LOG_LEVEL | How chatty do you want to logging to be. Values can be (in order by chattyness) `debug` `info` `error`. | `debug`   

If NodeJS detects it's running in production and missing required configuration, NodeJS will terminate the process, `exit 1`.

#### Header Mapping 
By default this service will map these properties, but you can change them via environment variable called `HEADER_MAPPER` so long as you follow the object structure.  

```json
    [
    {"incoming": "SMGOV_USERIDENTIFIER", "outgoing": "sub", "required": true},
    {"incoming": "SMGOV_USERTYPE", "outgoing": "userType", "required": true},
    {"incoming": "SMGOV_USERDISPLAYNAME", "outgoing": "name", "required": true}
    ]
```


## Integrate your UI app

TODO: describe integration

## Integrate your API app

TODO: describe integration

## ID Token 

Example [Required ID Token claims](http://openid.net/specs/openid-connect-core-1_0.html#IDToken) use for this bridge:

```
{
   "iss": "http://localhost:8080",
   "sub": "987987SKJSDKLJSKLDJKLM8907087987",
   "aud": "0",
   "nonce": "654a654s8d7987320z",
   "exp": 1311281970,
   "iat": 1311280970,
   "auth_time": 1311280969,
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
}
```

### Token Mapping from SiteMinder HTTP Headers

SiteMinder HTTP Header | Description | Mapped to ID Token Claim (JSON) | Always Provider
------------ | ------------- | ------------- | -------------
`SM_TIMETOEXPIRE` | The amount of time remaining in the session | `exp` | yes
`SMGOV_USERIDENTIFIER` | A character string that uniquely identifies the user.   This is typically a 32 character string consisting of hexadecimal characters but may be tailored to the requirements of the relying party. | sub | yes
`SMGOV_USERTYPE` | The type of user that was authenticated.  Will have one of the following values | TBD | yes
`SMGOV_USERDISPLAYNAME` | The display name of the user that can be displayed on web pages | `name` | yes
 

# Developers

Most will just use this service out-of-the-box but if you wanted to contribute a feature, fix a bug or tweak for your needs, continue reading.

## Development Environment


