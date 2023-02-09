## Ory-Nextjs

This repo try to implement authorization feature with Ory and Nextjs. It has following feature:

- Social auth and password login 
- OAuth2 Authorization code flow -> Retrieve JWT token for API authorization
- Simple login, logout, recovery flow

## How to set it up

### Prepare Ory account and cli
- Register a Ory Network account and create a test project
- install ory cli by `brew install ory/tap/cli` (mac) [^1]
- Use `ory auth` to sign in your account

### Prepare OAuth2 Client

- Setup new OAuth2 Client, first create a new OAuth2 client in Ory Network console with below configuration (Use custom template)
  - Client Name: API OAuth2
  - scope: offline_access, offline, openid
  - Redirect uri: http:127.0.0.1:3000/callback (This is a placeholder, we will change it later because Ory Network console doesn't accept localhost. We need to update it through CLI)
  - Grant type: Authorization Code
  - Response type: code
  - Authentication Method: HTTP Basic Authorization
  - Audience: https://api.summerbug.org (Be careful ory only recognize valid url here, if you set something like http://localhost:3000 it will be ignored by Ory and your accessToken's decoded aud will be empty)
- Update the needed field with ory cli

```
ory update oauth2-client <client_id> --project <project_id> --audience https://api.summerbug.org --redirect-uri http://localhost:3000/callback --name 'API OAuth2'
```

### Update OAuth2 config

```
ory patch oauth2-config <your_project_id> \
    --replace '/urls/consent="http://localhost:3000/consent"'
```

```
ory patch oauth2-config <your_project_id> \
    --replace '/strategies/access_token="jwt"'
```

### Use our own custom ui

- In Ory Network console, go to CUSTOMIZE -> USER INTERFACE -> CUSTOM UI
- change these configuration

```
Login UI: http://localhost:3000/login
Registration UI: http://localhost:3000/registration
Settings UI: http://localhost:3000/settings
Verification UI: /ui/verification
Recovery UI: http://localhost:3000/recovery
Error UI: /ui/error
```

### Setup Social Sign-in with GitHub

- Follow Ory setup [guide](https://www.ory.sh/docs/kratos/social-signin/github)
- use default JSON CONNECT SCHEMA

### Add necessary env variable

- Add `.env.local` file at the root of this project
- Add below env variables

```
NEXT_PUBLIC_CONSOLE_BASE_URL=http://localhost:3000
NEXT_PUBLIC_ORY_SDK_URL=http://localhost:4000
OAUTH_AUDIENCE=http://localhost:8080
OAUTH_CLIENT_ID=<your_oauth_client_id>
OAUTH_CLIENT_SECRET=<your_oauth_client_secret>
OAUTH_CLIENT_SCOPE=offline_access
ORY_API_KEY=<your_ory_personal_token>
```

### Setup Ory Tunnel

- Use `ory ls projects` to recognize your test project
- Setup Ory tunnel [^2]

```
ory tunnel --dev --project {project.slug} \
  http://localhost:3000
```

### Issues

- When access admin endpoint, the request will fall with 401 code even with correct personal token, You need to use ory-project-url but this will further cause CSRF issue.

[^1]: [Ory cli installation](https://www.ory.sh/docs/guides/cli/installation)
[^2]: [Develop applications on your local machine](https://www.ory.sh/docs/getting-started/local-development)
