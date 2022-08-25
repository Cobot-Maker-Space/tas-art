var formData;

// THIS DOES NOT WORK - ASYNC PROBLEMS - POSTED FORM IS EMPTY

document.getElementById("submit").addEventListener("click", function (e) {
    if (formData != null) {
        fetch('/smart-action-upload', {
            method: 'POST',
            body: formData
        });
    };
});

document.getElementById("generate").addEventListener("click", function (e) {
    document.getElementById("generate").disabled = true;
    document.getElementById("generate").className = "btn btn-warning mt-2 mb-5 me-2";
    document.getElementById("generate").innerHTML = "🔄 Generating ...";

    if (document.getElementById("fiducial").files.length == 0) {
        return;
    }

    var fiducialInner = document.getElementById("fiducial").files[0];
    var fiducialInnerURL = window.URL.createObjectURL(fiducialInner);
    THREEx.ArPatternFile.buildFullMarker(
        window.URL.createObjectURL(fiducialInner), 0.5, 512, "black",
        function (markerURL) {
            THREEx.ArPatternFile.encodeImageURL(
                fiducialInnerURL, async function (patternString) {
                    formData = await processFiles(markerURL, patternString);
                    
                    console.log(formData.get("name"));
                    document.getElementById("generate").className = "btn btn-success mt-2 mb-5 me-2";
                    document.getElementById("generate").innerHTML = "✅ Success!";
                    document.getElementById("submit").disabled = false;
                });
        });
});

async function processFiles(markerURL, patternString) {
    var patternURL = window.URL.createObjectURL(new Blob([patternString], { type: 'text/plain' }));
    var patternFile = await fetch(patternURL)
        .then(r => r.blob())
        .then(blobFile => new File([blobFile], "pattern.patt", { type: "text/plain" }));

    var printDesc = {
        content: [
            {
                image: markerURL,
                width: 300,
                alignment: 'center',
            },
            {
                image: markerURL,
                width: 300,
                alignment: 'center',
            },
        ]
    }
    pdfMake.createPdf(printDesc).getDataUrl(async function (fileURL) {
        var printFile = await fetch(fileURL)
            .then(r => r.blob())
            .then(blobFile => new File([blobFile], "print.pdf", { type: "application/pdf" }));

        const formData = new FormData();
        
        formData.append("name", document.getElementById("name").value);
        formData.append("patternFile", patternFile);
        formData.append("markerPrint", printFile);
        formData.append("arIcon", document.getElementById("ar-icon").files[0]);
        formData.append("arIconConfirm", document.getElementById("ar-icon-confirm").files[0]);
    });

    return formData;
};