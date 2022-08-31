const socket = io('/')

document.getElementById('activate').onclick = function () {
  document.getElementById('activate').disabled = true
  document.getElementById('activate').class = 'btn btn-secondary px-4 mb-5'
  document.getElementById('activate').innerHTML = '↻ Connecting ...'
  document.getElementById('failure').style.display = 'none'

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
