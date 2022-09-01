const socket = io('/')

/**
 * * Checks if the server has established a connection to the new robot
 * i.e., the admin has set it up correctly
 */
document.getElementById('activate').onclick = function () {
  document.getElementById('activate').disabled = true
  document.getElementById('activate').class = 'btn btn-secondary px-4 mb-5'
  document.getElementById('activate').innerHTML = '↻ Connecting ...'
  document.getElementById('failure').style.display = 'none'

  // Basic emission and response to check if the robot is active
  socket.emit('check-robot-life', encodeURIComponent(ROBOT_PUBLIC_ID))
  socket.on('robot-alive', robotPublicId => {
    document.getElementById('success-form').submit()
  })
  socket.on('robot-dead', robotPublicId => {
    document.getElementById('activate').disabled = false
    document.getElementById('activate').class = 'btn btn-primary px-4 mb-5'
    document.getElementById('activate').innerHTML = '✅ Validate connection'
    document.getElementById('failure').style.display = 'block'
  })
}
