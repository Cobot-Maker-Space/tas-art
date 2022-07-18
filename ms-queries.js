// need to implement login state verification for security

export const login =
    "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?" +
    "client_id=5cb0b9bf-c370-48dc-adae-06fa18143ed3" +
    "&response_type=code" +
    "&redirect_uri=https%3A%2F%2Fopen-all-senses.cobotmakerspace.org%2Fms-socket" +
    "&response_mode=query" +
    "&scope=user.readbasic.all%20presence.read.all" +
    "&state=12345";
export const logout =
    "https://login.microsoftonline.com/organizations/oauth2/v2.0/logout?" +
    "post_logout_redirect_uri=https%3A%2F%2Fopen-all-senses.cobotmakerspace.org"
    ;

export const requestTokenURL = "https://login.microsoftonline.com/organizations/oauth2/v2.0/token";
export function requestTokenBody(code) {
    return {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "client_id=5cb0b9bf-c370-48dc-adae-06fa18143ed3" +
            "&scope=user.readbasic.all%20presence.read.all" +
            "&code=" + code +
            "&grant_type=authorization_code" +
            "&redirect_uri=https%3A%2F%2Fopen-all-senses.cobotmakerspace.org%2Fms-socket" +
            "&client_secret=Vwm8Q~BQylr9~apjFDMVFhhsv0Za0ZYdePB7dabY"
    };
}

export function refreshTokenBody(refresh_token) {
    return {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "client_id=5cb0b9bf-c370-48dc-adae-06fa18143ed3" +
            "&scope=user.readbasic.all%20presence.read.all" +
            "&refresh_token=" + refresh_token +
            "&grant_type=refresh_token" +
            "&redirect_uri=https%3A%2F%2Fopen-all-senses.cobotmakerspace.org%2Fms-socket" +
            "&client_secret=Vwm8Q~BQylr9~apjFDMVFhhsv0Za0ZYdePB7dabY"
    };
};

export function getDataBody(token) {
    return {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + token,
            "Host": "graph.microsoft.com"
        }
    };
}

export const getUserDataURL = "https://graph.microsoft.com/v1.0/me";
export const getUserPhotoURL = "https://graph.microsoft.com/v1.0/me/photo/$value";