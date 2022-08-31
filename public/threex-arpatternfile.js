// ! UTILITY FILE SOURCED FROM ->
// ! https://github.com/jeromeetienne/AR.js/blob/master/three.js/examples/marker-training/threex-arpatternfile.js
// ! I DID NOT WRITE THIS FILE

var THREEx = THREEx || {}

THREEx.ArPatternFile = {}

THREEx.ArPatternFile.toCanvas = function (patternFileString, onComplete) {
  console.assert(false, 'not yet implemented')
}

THREEx.ArPatternFile.encodeImageURL = function (imageURL, onComplete) {
  var image = new Image()
  image.onload = function () {
    var patternFileString = THREEx.ArPatternFile.encodeImage(image)
    onComplete(patternFileString)
  }
  image.src = imageURL
}

THREEx.ArPatternFile.encodeImage = function (image) {
  var canvas = document.createElement('canvas')
  var context = canvas.getContext('2d')
  canvas.width = 16
  canvas.height = 16

  var patternFileString = ''
  for (
    var orientation = 0;
    orientation > -2 * Math.PI;
    orientation -= Math.PI / 2
  ) {
    context.save()
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.translate(canvas.width / 2, canvas.height / 2)
    context.rotate(orientation)
    context.drawImage(
      image,
      -canvas.width / 2,
      -canvas.height / 2,
      canvas.width,
      canvas.height
    )
    context.restore()

    var imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    if (orientation !== 0) patternFileString += '\n'
    for (var channelOffset = 2; channelOffset >= 0; channelOffset--) {
      for (var y = 0; y < imageData.height; y++) {
        for (var x = 0; x < imageData.width; x++) {
          if (x !== 0) patternFileString += ' '

          var offset = y * imageData.width * 4 + x * 4 + channelOffset
          var value = imageData.data[offset]

          patternFileString += String(value).padStart(3)
        }
        patternFileString += '\n'
      }
    }
  }

  return patternFileString
}

THREEx.ArPatternFile.triggerDownload = function (
  patternFileString,
  fileName = 'pattern-marker.patt'
) {
  var domElement = window.document.createElement('a')
  domElement.href = window.URL.createObjectURL(
    new Blob([patternFileString], { type: 'text/plain' })
  )
  domElement.download = fileName
  document.body.appendChild(domElement)
  domElement.click()
  document.body.removeChild(domElement)
}

THREEx.ArPatternFile.buildFullMarker = function (
  innerImageURL,
  pattRatio,
  size,
  color,
  onComplete
) {
  var whiteMargin = 0.1
  var blackMargin = (1 - 2 * whiteMargin) * ((1 - pattRatio) / 2)

  var innerMargin = whiteMargin + blackMargin

  var canvas = document.createElement('canvas')
  var context = canvas.getContext('2d')
  canvas.width = canvas.height = size

  context.fillStyle = 'white'
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.fillStyle = color
  context.fillRect(
    whiteMargin * canvas.width,
    whiteMargin * canvas.height,
    canvas.width * (1 - 2 * whiteMargin),
    canvas.height * (1 - 2 * whiteMargin)
  )

  context.fillStyle = 'white'
  context.fillRect(
    innerMargin * canvas.width,
    innerMargin * canvas.height,
    canvas.width * (1 - 2 * innerMargin),
    canvas.height * (1 - 2 * innerMargin)
  )

  var innerImage = document.createElement('img')
  innerImage.addEventListener('load', function () {
    context.drawImage(
      innerImage,
      innerMargin * canvas.width,
      innerMargin * canvas.height,
      canvas.width * (1 - 2 * innerMargin),
      canvas.height * (1 - 2 * innerMargin)
    )

    var imageUrl = canvas.toDataURL()
    onComplete(imageUrl)
  })
  innerImage.src = innerImageURL
}
