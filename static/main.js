let formData = new FormData(document.querySelector("#uploadForm"));

let dropArea = document.querySelector("#dropArea");
let fileListArea = document.querySelector("#fileListOuter");

let dragEvents = ['dragenter', 'dragover', 'dragleave', 'drop'];

const preventDefaultPropagation = (element, events) => {
    events.forEach(e => {
       element.addEventListener(e, (i) => {
           i.preventDefault();
           i.stopPropagation();
       })
    });
}
preventDefaultPropagation(document.body, dragEvents);
preventDefaultPropagation(dropArea, dragEvents);

const addHoverClass = (element, events) => {
    events.forEach(e => {
        element.addEventListener(e, () => {
            element.classList.add("hover");
        });
    });
}
addHoverClass(dropArea, ['dragenter', 'dragover']);
addHoverClass(fileListArea, ['dragenter', 'dragover']);

const removeHoverClass = (element, events) => {
    events.forEach(e => {
        element.addEventListener(e, () => {
            element.classList.remove("hover");
        });
    });
}
removeHoverClass(dropArea, ['dragleave', 'drop']);
removeHoverClass(fileListArea, ['dragleave', 'drop']);

dropArea.addEventListener('drop', (e) => {
    let dt = e.dataTransfer;
    let files = dt.files;
    // console.log("Length : " + files.length);
    if(files.length > 100) {
        showError("File limit is 100 files.");
    }
    else {
        for (let i = 0; i < files.length; i++) {
            console.log(files[i]);
            if (files[i].name.endsWith(".t2d") || files[i].name.endsWith(".T2D")) {
                formData.append("file", files[i]);
                appendFilenameToList(files[i]);
                document.querySelector("#browseButton").disabled = true;
                document.querySelector("#convertButton").disabled = false;

                let resetButton = document.querySelector("#resetButton");
                resetButton.classList.remove("no-visible");
                resetButton.classList.add("ani-slide-up-slow");
                resetButton.addEventListener('animationend', () => {
                    resetButton.classList.remove("ani-slide-up-slow");
                });
                hideFileListInfo();
            } else {
                showError("Invalid filetype uploaded. Make sure that your file ends with \".t2d\"");
            }
        }
    }

});
let inputElement = document.querySelector("#fileInput");

inputElement.onchange = () => {
    formData = new FormData(document.querySelector("#uploadForm"));
    let fileList = inputElement.files;
    // console.log(fileList.length);
    if(fileList.length > 100) {
        showError("File limit is 100 files.");
    }
    else {
        for (let i = 0; i < fileList.length; i++) {
            appendFilenameToList(fileList[i]);
        }
        document.querySelector("#browseButton").disabled = true;
        document.querySelector("#convertButton").disabled = false;
        document.querySelector("#resetButton").classList.remove("no-visible");
        document.querySelector("#resetButton").classList.add("ani-slide-up-slow");
        hideFileListInfo();
    }
}

const upload = () => {

    document.querySelector("#convertButton").disabled = true;
    document.querySelector("#loaderDiv").classList.remove("no-visible");
    document.querySelector("#loaderDiv").classList.add("ani-slide-up");
    disableRadios();

    let hostname = window.location.href;
    checkRadioValue();
    formData.forEach((e) => { console.log(e);});
    fetch(hostname + "upload", {
        method: 'POST',
        body: formData
    }).then((response) => {

        if(response.status === 400)
            throw(400);
        else if(response.status === 500)
            throw(500);

        return response.blob();
    }).then(blob => {
        console.log(blob);
        return URL.createObjectURL(blob);
    }).then(url => {
        createDownloadLink(url);
    }).catch((e) => {
        if(e === 400){
            showError("Server responded with code 400: No valid files were uploaded.")
        }
        else if(e === 500){
            showError("Server responded with code 500: Internal Server Error.");
        }
        else {
            console.log(e.toString());
        }
    });
}

const createDownloadLink = (url) => {
    document.querySelector("#loaderDiv").classList.add("ani-slide-down");
    document.querySelector("#loaderDiv").classList.add("no-visible");

    console.log("URL:" + url.toString());

    let link = document.createElement("a");
        link.href = url;
        link.download = "result.zip";
        link.innerText = "click here";

    let text = document.createElement("p");
        text.id = "clickText";
        text.innerText = "If your download did not start, ";
        text.appendChild(link);

    link.click();

    document.querySelector("#textAppendHere").appendChild(text);
}

const appendFilenameToList = (file) => {
    let fileName = document.createElement("p");
    fileName.innerText = file.name;
    fileName.style = "float: left;";
    let fileSize = document.createElement("p");
    fileSize.innerText = bytesToString(file.size);
    fileSize.style = "float: right;"
    let fileDiv = document.createElement("div");
    fileDiv.id = "fileDiv";
    fileDiv.appendChild(fileName);
    fileDiv.appendChild(fileSize);
    document.querySelector("#fileList").append(fileDiv);

}

const bytesToString = (bytes) => {
    console.log(bytes);
    if(bytes === 0)
        return "0 bytes";
    else if (bytes < 1000000)
        return Math.round(bytes/1000) + " KB";
    else if(bytes < 1e+9){
        return Math.round(bytes/1000000) + " MB";
    }
}

const reset = () => {
    console.log("reset");
    document.querySelector("#uploadForm").reset();
    formData = new FormData(document.querySelector("#uploadForm"));

    let fileList = document.querySelector("#fileList");
    fileList.classList.add("ani-slide-down");
    fileList.addEventListener('animationend', () => {
       while (fileList.firstChild){
           fileList.removeChild(fileList.firstChild);
       }
       fileList.classList.remove("ani-slide-down");
       removeEventListeners(fileList);
    });

    let textAppendHere = document.querySelector("#textAppendHere");
    textAppendHere.classList.add("ani-slide-down");
    textAppendHere.addEventListener('animationend', () => {
        while (textAppendHere.firstChild){
            textAppendHere.removeChild(textAppendHere.firstChild);
        }
        textAppendHere.classList.remove("ani-slide-down");
        removeEventListeners(textAppendHere);
    });

    let resetButton = document.querySelector("#resetButton");
    resetButton.classList.add("ani-slide-down-slow");
    resetButton.addEventListener('animationend', () =>{
        resetButton.classList.remove("ani-slide-down-slow");
        resetButton.classList.add("no-visible");
        removeEventListeners(resetButton);
    });

    document.querySelector("#browseButton").disabled = false;
    document.querySelector("#convertButton").disabled = true;

    showFileListInfo();

    enableRadios();

}

const removeEventListeners = (element) => {
    let clone = element.cloneNode(true);
    element.parentNode.replaceChild(clone, element);
}

const checkRadioValue = () => {
    let radios = document.getElementsByName("outputRadio");
    formData.delete('outputRadio');
    if(radios[0].checked)
        formData.append('outputRadio', '.mzxml');
    else
        formData.append('outputRadio', '.txt');
}

const showError = (msg) => {
    let errorArea = document.querySelector("#errorArea");
    let errorDiv = document.createElement("div");
    errorDiv.id = "error";
    errorDiv.classList.add("pop-down-ani");
    errorDiv.addEventListener('animationend', () => {
        errorArea.removeChild(errorDiv);
    });
    let p = document.createElement("p");
    p.innerText = msg;
    errorDiv.appendChild(p);
    errorArea.appendChild(errorDiv);
}

const hideFileListInfo = () => {
    let fileListInfo = document.querySelector("#fileListInfo");
    fileListInfo.classList.add("ani-slide-down");
    fileListInfo.addEventListener('animationend', () => {
        fileListInfo.classList.add("no-visible");
        fileListInfo.classList.remove("ani-slide-down");
        removeEventListeners(fileListInfo);
    });
}

const showFileListInfo = () => {
    let fileListInfo = document.querySelector("#fileListInfo");
    fileListInfo.classList.add("ani-slide-up");
    fileListInfo.classList.remove("no-visible");
    fileListInfo.addEventListener('animationend', () => {
        fileListInfo.classList.remove("ani-slide-up");
        removeEventListeners(fileListInfo);
    });
}

const disableRadios = () => {
    let radios = document.getElementsByName("outputRadio");
    radios[0].disabled = true;
    radios[1].disabled = true;
}

const enableRadios = () => {
    let radios = document.getElementsByName("outputRadio");
    radios[0].disabled = false;
    radios[1].disabled = false;
}

