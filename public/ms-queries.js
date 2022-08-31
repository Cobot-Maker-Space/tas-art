const clientId = '5cb0b9bf-c370-48dc-adae-06fa18143ed3'
const clientSecret = 'Vwm8Q~BQylr9~apjFDMVFhhsv0Za0ZYdePB7dabY'

const permissions =
  '&scope=user.readbasic.all%20presence.read.all%20chat.read%20chat.readbasic%20chat.readwrite%20chatmessage.send'

export function login (org) {
  return (
    'https://login.microsoftonline.com/' +
    org +
    '/oauth2/v2.0/authorize?' +
    'client_id=' +
    clientId +
    '&response_type=code' +
    '&redirect_uri=https%3A%2F%2Fopen-all-senses.cobotmakerspace.org%2Fms-socket' +
    '&response_mode=query' +
    permissions +
    '&state=12345'
  )
}
export function logout (org) {
  return (
    'https://login.microsoftonline.com/organizations/oauth2/v2.0/logout?' +
    'post_logout_redirect_uri=https%3A%2F%2Fopen-all-senses.cobotmakerspace.org'
  )
}

export function requestTokenURL (org) {
  return 'https://login.microsoftonline.com/' + org + '/oauth2/v2.0/token'
}
export function requestTokenBody (code) {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body:
      'client_id=5cb0b9bf-c370-48dc-adae-06fa18143ed3' +
      permissions +
      '&code=' +
      code +
      '&grant_type=authorization_code' +
      '&redirect_uri=https%3A%2F%2Fopen-all-senses.cobotmakerspace.org%2Fms-socket' +
      '&client_secret=' +
      clientSecret
  }
}

export function refreshTokenBody (refresh_token) {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body:
      'client_id=5cb0b9bf-c370-48dc-adae-06fa18143ed3' +
      permissions +
      '&refresh_token=' +
      refresh_token +
      '&grant_type=refresh_token' +
      '&redirect_uri=https%3A%2F%2Fopen-all-senses.cobotmakerspace.org%2Fms-socket' +
      '&client_secret=' +
      clientSecret
  }
}

export const getUserDataURL = 'https://graph.microsoft.com/v1.0/me'
export function getOtherUserDataURL (id) {
  return 'https://graph.microsoft.com/v1.0/users/' + id
}

export const getUserPhotoURL =
  'https://graph.microsoft.com/v1.0/me/photos/48x48/$value'
export function getOtherUserPhotoURL (id) {
  return 'https://graph.microsoft.com/v1.0/users/' + id + '/photos/48x48/$value'
}
export function getDataBody (token) {
  return {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
      Host: 'graph.microsoft.com'
    }
  }
}

export function getUserPresenceURL (user_id) {
  return 'https://graph.microsoft.com/v1.0/users/' + user_id + '/presence'
}

export function sendChatURL (chat_id) {
  return 'https://graph.microsoft.com/v1.0/chats/' + chat_id + '/messages'
}
export function sendChatBody (token, msg) {
  return {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      Host: 'graph.microsoft.com',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ body: { content: msg } })
  }
}
