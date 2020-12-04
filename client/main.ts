import Konva from 'konva';
import hotkeys from 'hotkeys-js';
import { workspace } from './workspace';
import { stage, currentLayer, gridAlignment } from './workspace';
import { ic74x245 } from './components/74x245';
import { onError, typeGuard } from './utils';
import theme from '../theme.json';
import { AddWireInteraction } from './actions/add_wire';
import { SelectInteraction } from './actions/select';
import { MoveSelectionInteraction } from './actions/move_selection';
import { DeleteComponentsMutation } from './actions/delete_action';
import { selectionAddresses, selectionByType } from './components/selectable_component';
import { Component } from './components/component';
import { AddComponentInteraction } from './actions/add_ic_action';
 
window.onerror = (errorMsg, url, lineNumber) => {
  onError(errorMsg, url, lineNumber);
  return false;
};

(window as any).add245 = function () {
  new AddComponentInteraction(new ic74x245());
};

(window as any).clearActionsHistory = function () {
  localStorage.setItem('actions_history', JSON.stringify([]));
  location.reload();
};

(window as any).addOrthogonal = function() {
  workspace.cancelInteractions();
  new AddWireInteraction();
};

(window as any).toolSelect = function() {
  workspace.cancelInteractions();
  new SelectInteraction();
};

(window as any).deleteSelection = deleteSelection;

(window as any).moveSelection = function() {
  workspace.cancelInteractions();
  new MoveSelectionInteraction();
};

(window as any).downloadScene = function() {
  let w = workspace.serialize();
  delete w.history;
  var text = JSON.stringify(w),
    blob = new Blob([text], { type: 'text/plain' }),
    anchor = document.createElement('a');
  anchor.download = "scheme.bbw";
  anchor.href = (window.webkitURL || window.URL).createObjectURL(blob);
  anchor.dataset.downloadurl = ['text/plain', anchor.download, anchor.href].join(':');
  anchor.click();
};

const fileSelector = document.getElementById('file-selector') as HTMLInputElement;
fileSelector?.addEventListener('change', () => {  
  const fileList = fileSelector.files;
  if (fileList == null) return;
  const file = fileList.item(0);
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', (event) => {    
    const s = event.target?.result;
    if (typeGuard(s, 'string')) {      
      workspace.deserialize(JSON.parse(s));
      fileSelector.value = '';
    }
  });
  reader.readAsText(file);
});

function deleteSelection() {
  workspace.cancelInteractions();
  // TODO: deletion for wire points should work differently.
  workspace.update(new DeleteComponentsMutation(selectionByType(Component).map(c => c.serialize()), selectionAddresses()));
}

// first we need to create a stage
stage(new Konva.Stage({
  container: 'container',   // id of container <div>
  width: window.screen.width,
  height: window.screen.height,
}));

stage()!.container().style.backgroundColor = theme.backgroud;

document.getElementById('container')?.addEventListener('contextmenu', e => {
  e.preventDefault()
});

stage().add(currentLayer(new Konva.Layer()));
currentLayer()?.scaleX(2);
currentLayer()?.scaleY(2);

stage().on('mousemove', function (e: Konva.KonvaEventObject<MouseEvent>) {
  workspace.onMouseMove(e);
});

stage().on('wheel', function(e : Konva.KonvaEventObject<WheelEvent>) {
  workspace.onMouseWheel(e);
});

stage().on('mousedown', function (e) {
  workspace.onMouseDown(e);
});

stage().on('mouseup', function(e) {
  workspace.onMouseUp(e); 
});

hotkeys('esc', function (e) {
  e.preventDefault();
  workspace.cancelInteractions();
});

hotkeys('ctrl+z', function (e) {
  e.preventDefault();
  workspace.undo();
});

hotkeys('ctrl+y', function (e) {
  e.preventDefault();
  workspace.redo();
});

hotkeys('del', function () {
  deleteSelection();
});

gridAlignment(15);
workspace.loadFromLocalHistory();