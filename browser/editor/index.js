import EditorController from './controller';

function loadFile(model, element) {
  return function (e) {

    var imageTypes = ["image/jpeg", "image/jpg", "image/gif", "image/png"];
    var jsonTypes = ["application/json"];

    var filetype = element[0].files[0].type;

    /* this section is to deal with a strange bug on some windows machines where
     * uploaded files have their file types listed as an empty string. */
    if (filetype == "") {
      filetype = element[0].files[0].name.split(".");
      filetype = filetype[filetype.length - 1];
      if (filetype == "json") {
        filetype = "application/json";
      }
      if (["jpeg", "jpg", "gif", "png"].indexOf(filetype) !== -1) {
        filetype = "image/" + filetype;
      }
    }

    if (jsonTypes.indexOf(filetype) !== -1) {
      loadJSONPuppet(element, e);
    } else if (imageTypes.indexOf(filetype) !== -1) {
      loadImage(element, e);
    } else {
      console.log("loadFile() called for unsupported filetype: " + element[0].files[0].type);
    }
  };
};

function loadJSONPuppet(element, e) {
  var reader = new FileReader();
  reader.onload = function (e) {
    var puppetData = JSON.parse(e.target.result);
    var image = new Image();
    image.onload = function () {
      var imageNoBG = new Image();
      imageNoBG.onload = function () {
        var p = new Puppet(image);
        p.setImageToMeshData(imageNoBG, puppetData.controlPointPositions, puppetData.backgroundRemovalData);
        p.generateMesh(puppetData.verts, puppetData.faces, puppetData.controlPoints);
        dranimate.addPuppet(p);
      };
      imageNoBG.src = puppetData.imageNoBGData;
    };
    image.src = puppetData.imageData;
  };
  reader.readAsText(element[0].files[0]);
}

function loadImage(element, e) {
  var reader = new FileReader();
  reader.onload = function (e) {
    //open puppet edit window here !!!
    //console.log(reader.result);
    imageToMesh.editImage(reader.result);
  }
  reader.readAsDataURL(element[0].files[0]);
}


const app = angular
  .module('dranimate.editor', [
    'ngMaterial',
    'dranimate.editor.puppetDashboard',
    'dranimate.editor.zoompanner',
    'dranimate.model'
  ])
  .component([
    templateUrl: 'editor/editor.html',
    controller: EditorController,
  ]);

app.directive('dranimateNewPuppetFromJson', NewPuppetFromJsonDirective);
app.directive('dranimateFileUploadContainer', FileUploadContainerDirective);
app.directive('dranimateStageContainer', StageContainerDirective);

export default app;