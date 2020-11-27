import Konva from 'konva';
import hotkeys from 'hotkeys-js';
import { workspace } from './workspace';
import { stage, currentLayer, gridAlignment, Point } from './workspace';
import { SelectAction } from './mutations/select_action';
import { ic74x245 } from './components/74x245';
import { PlaceComponentAction } from './mutations/add_ic_action';
import { AddWireAction } from './mutations/add_wire';
import { DeleteSelectionAction } from './mutations/delete_action';
import { MoveSelectionAction } from './mutations/move_selection';
import { onError, typeGuard } from './utils';
import theme from '../theme.json';

window.onerror = function myErrorHandler(errorMsg, url, lineNumber) {
  onError(errorMsg, url, lineNumber);
  return false;
};

(window as any).add245 = function () {
  workspace.currentAction(new PlaceComponentAction(new ic74x245()));
};

(window as any).clearActionsHistory = function () {
  localStorage.setItem('actions_history', JSON.stringify([]));
  location.reload();
};

(window as any).addOrthogonal = function() {
  workspace.currentAction(new AddWireAction());
};

(window as any).toolSelect = function() {
  workspace.currentAction(new SelectAction());
};

(window as any).deleteSelection = deleteSelection;

(window as any).moveSelection = function() {
  workspace.currentAction(new MoveSelectionAction());
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
fileSelector?.addEventListener('change', (event: Event) => {  
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
  workspace.currentAction(new DeleteSelectionAction());
  workspace.commitAction();
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
  workspace.cancelCurrentAction();
});

hotkeys('ctrl+z', function (e) {
  e.preventDefault();
  workspace.undo();
});

hotkeys('ctrl+y', function (e) {
  e.preventDefault();
  workspace.redo();
});

hotkeys('del', function (e) {
  deleteSelection();
});

gridAlignment(15);
workspace.loadFromLocalHistory();