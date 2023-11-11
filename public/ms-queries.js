/**
 * Unified location for Microsoft Graph queries.
 */
// TODO: Increase security with a volatile State (e.g., in login payload), which is checked by the server

import config from "config";
import util from "util";

function add_permissions(search_params) {
  var perms = [
    "user.readbasic.all",
    "presence.read.all",
    "chat.read",
    "chat.readbasic",
    "chat.readwrite",
    "chatmessage.send",
  ];
  search_params.append("scope", perms.join(" "));
}

export function login(redirect_uri) {
  var url = new URL("https://login.microsoftonline.com/");
  url.pathname = util.format(
    "%s/oauth2/v2.0/authorize",
    config.get("organization.id")
  );
  var query = new URLSearchParams();
  query.append("client_id", config.get("ms-graph-api.client_id"));
  query.append("response_type", "code");
  query.append("redirect_uri", util.format("%s/ms-socket", redirect_uri));
  query.append("response_mode", "query");
  add_permissions(query);
  query.append("state", "12345");
  url.search = query;
  return url.toString();
}

export function logout(redirect_uri) {
  var url = new URL(
    "https://login.microsoftonline.com/organizations/oauth2/v2.0/logout"
  );
  url.searchParams.append("post_logout_redirect_uri", redirect_uri);
  return url.toString();
}

export function requestTokenURL() {
  var url = new URL("https://login.microsoftonline.com/");
  url.pathname = util.format(
    "%s/oauth2/v2.0/token",
    config.get("organization.id")
  );
  return url.toString();
}

export function requestTokenBody(code, redirect_uri) {
  var query = new URLSearchParams();
  query.append("client_id", config.get("ms-graph-api.client_id"));
  add_permissions(query);
  query.append("code", code);
  query.append("grant_type", "authorization_code");
  query.append("redirect_uri", util.format("%s/ms-socket", redirect_uri));
  query.append("client_secret", config.get("ms-graph-api.client_secret"));
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: query.toString(),
  };
}

export function getUserDataURL() {
  return new URL("https://graph.microsoft.com/v1.0/me").toString();
}

export function getOtherUserDataURL(id) {
  return new URL(
    util.format("https://graph.microsoft.com/v1.0/users/%s", id)
  ).toString();
}

export function getUserPhotoURL() {
  return new URL(
    "https://graph.microsoft.com/v1.0/me/photos/48x48/$value"
  ).toString();
}

export function getOtherUserPhotoURL(id) {
  return new URL(
    util.format(
      "https://graph.microsoft.com/v1.0/users/%s/photos/48x48/$value",
      id
    )
  ).toString();
}

export function getUserPresenceURL(user_id) {
  return new URL(
    util.format("https://graph.microsoft.com/v1.0/users/%s/presence", user_id)
  ).toString();
}

export function getDataBody(token) {
  return {
    method: "GET",
    headers: {
      Authorization: util.format("Bearer %s", token),
      Host: "graph.microsoft.com",
    },
  };
}

export function sendChatURL(chat_id) {
  return new URL(
    util.format("https://graph.microsoft.com/v1.0/chats/%s/messages", chat_id)
  ).toString();
}

export function sendChatBody(token, msg) {
  return {
    method: "POST",
    headers: {
      Authorization: util.format("Bearer %s", token),
      Host: "graph.microsoft.com",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body: { content: msg } }),
  };
}
