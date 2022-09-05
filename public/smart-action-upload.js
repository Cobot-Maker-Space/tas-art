/**
 * * Generates the fiducial marker data needed for AR, delivers to server
 * TODO: Validate incoming data and offer failure state (e.g., if marker image isn't a .jpg)
 * ! Will fail uncleanly if a query box is empty on the site, and inputs not sanitised
 */
document.getElementById("generate").addEventListener("click", function (e) {
  document.getElementById("generate").disabled = true;
  document.getElementById("generate").className =
    "btn btn-warning mt-2 mb-5 me-2";
  document.getElementById("generate").innerHTML = "🔄 Generating ...";

  // Break if there isn't a fiducial file uploaded
  if (document.getElementById("fiducial").files.length == 0) {
    return;
  }

  var fiducialInner = document.getElementById("fiducial").files[0];
  var fiducialInnerURL = window.URL.createObjectURL(fiducialInner);

  /**
   * ? This is all sequentially async because everything needs to be generated before it can be sent to the server
   * It's definitely messy code though, the order is ->
   * 1. Wait for the marker image to be generated
   * 2. Wait for the internal pattern string to be generated
   * 3. Wait for the internal pattern string to be saved to a .pat file
   * 4. Wait for a .pdf to be made containing the marker image
   * 5. Wait for the server to finish saving POSTed data
   * 6. Submit the completion form to GET the next page
   * ! 5 and 6 is a bodge because you cannot reroute ExpressJS asynchronously
   */

  /**
   * markerCallback
   * * Handles the .jpg marker image once it is generated
   * @param markerURL Object URL of the actual .jpg marker image
   * ? This is the actual marker image which will be printed and attached to walls
   */
  function markerCallback(markerURL) {
    /**
     * patternCallback
     * * Handles the pattern string to convert it to a .pat file
     * @param patternString A series of integers representing the pattern
     * ? This is the internal representation of the marker for detection usage in AR
     */
    async function patternCallback(patternString) {
      await processFiles(markerURL, patternString);
      document.getElementById("generate").className =
        "btn btn-success mt-2 mb-5 me-2";
      document.getElementById("generate").innerHTML = "✅ Success!";
    }
    THREEx.ArPatternFile.encodeImageURL(fiducialInnerURL, patternCallback);
  }

  /**
   * processFiles
   * * Once the data is generated, parse into files and POST to server
   * @param markerURL Object URL of the actual .jpg marker image
   * @param patternString A series of integers representing the pattern
   */
  async function processFiles(markerURL, patternString) {
    // Convert pattern URL to object, then file
    var patternURL = window.URL.createObjectURL(
      new Blob([patternString], { type: "text/plain" })
    );
    var patternFile = await fetch(patternURL)
      .then((r) => r.blob())
      .then(
        (blobFile) =>
          new File([blobFile], "pattern.patt", { type: "text/plain" })
      );

    // Create a .pdf with the marker image in it (twice)
    var printDesc = {
      content: [
        {
          image: markerURL,
          width: 300,
          alignment: "center",
        },
        {
          image: markerURL,
          width: 300,
          alignment: "center",
        },
      ],
    };
    pdfMake.createPdf(printDesc).getDataUrl(async function (fileURL) {
      var printFile = await fetch(fileURL)
        .then((r) => r.blob())
        .then(
          (blobFile) =>
            new File([blobFile], "print.pdf", { type: "application/pdf" })
        );

      // Populate form data
      const formData = new FormData();

      formData.append("name", document.getElementById("name").value);
      formData.append("patternFile", patternFile);
      formData.append("markerPrint", printFile);
      formData.append("arIcon", document.getElementById("ar-icon").files[0]);
      formData.append(
        "arIconConfirm",
        document.getElementById("ar-icon-confirm").files[0]
      );

      // POST to server to save to db.js and /public
      await fetch("/smart-action-upload", {
        method: "POST",
        body: formData,
      });

      // Submit form to GET next step
      document.getElementById("moveon").submit();
    });
  }

  THREEx.ArPatternFile.buildFullMarker(
    fiducialInnerURL,
    0.5,
    512,
    "black",
    markerCallback
  );
});
