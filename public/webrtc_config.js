import config from "config";

/**
 * configWebRTC
 * * STUN/TURN server config for the WebRTC connection
 * ? Can be easily configured to different servers if needed
 * Used by driver.js and robot.js
 */
export function configWebRTC() {
  const socket = io("/");
  const me = new Peer(config.get("peer"));
  return [socket, me];
}
