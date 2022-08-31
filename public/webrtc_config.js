export function configWebRTC () {
  const socket = io('/')
  const me = new Peer({
    config: {
      iceServers: [
        {
          urls: 'stun:openrelay.metered.ca:80'
        },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ]
    }
  })

  return [socket, me]
}
