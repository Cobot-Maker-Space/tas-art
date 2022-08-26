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

    console.log("1");

    var fiducialInner = document.getElementById("fiducial").files[0];
    var fiducialInnerURL = window.URL.createObjectURL(fiducialInner);
    THREEx.ArPatternFile.buildFullMarker(window.URL.createObjectURL(fiducialInner), 0.5, 512, "black", markerCallback(markerURL));

    console.log("9");
});

async function markerCallback(markerURL) {
    function processMarker() {
        return new Promise(resolve => { 
            async function patternCallback(patternString) {
                function processPattern() {
                    return new Promise(resolve => {
                        console.log("2");
                        formData = await processFiles(markerURL, patternString);
                        console.log("8");
                        document.getElementById("generate").className = "btn btn-success mt-2 mb-5 me-2";
                        document.getElementById("generate").innerHTML = "✅ Success!";
                        document.getElementById("submit").disabled = false;
                        resolve();
                    });
                };
                await processPattern();
            };
            THREEx.ArPatternFile.encodeImageURL(fiducialInnerURL, patternCallback(patternString));
            resolve();
        });
    };
    await processMarker();
};



async function processFiles(markerURL, patternString) {

    console.log("3");

    var patternURL = window.URL.createObjectURL(new Blob([patternString], { type: 'text/plain' }));
    var patternFile = await fetch(patternURL)
        .then(r => r.blob())
        .then(blobFile => new File([blobFile], "pattern.patt", { type: "text/plain" }));

    console.log("4");

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
        console.log("5");

        var printFile = await fetch(fileURL)
            .then(r => r.blob())
            .then(blobFile => new File([blobFile], "print.pdf", { type: "application/pdf" }));

        console.log("6");

        const formData = new FormData();
        
        formData.append("name", document.getElementById("name").value);
        formData.append("patternFile", patternFile);
        formData.append("markerPrint", printFile);
        formData.append("arIcon", document.getElementById("ar-icon").files[0]);
        formData.append("arIconConfirm", document.getElementById("ar-icon-confirm").files[0]);
    });

    console.log("7");
};