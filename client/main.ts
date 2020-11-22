import Konva from 'konva';
import hotkeys from 'hotkeys-js';
import { workspace } from './workspace';
import { stage, currentLayer, gridAlignment, Point } from './workspace';
import { SelectAction } from './actions/select_action';
import { ic74x245 } from './components/74x245';
import { PlaceComponentAction } from './actions/add_ic_action';
import { AddWireAction } from './actions/add_wire';
import { selection } from './components/selectable_component';
import { DeleteSelectionAction } from './actions/delete_action';
import { MoveSelectionAction } from './actions/move_selection';
import { typeGuard } from './utils';
import theme from '../theme.json';

(window as any).add245 = function () {
  workspace.current(new PlaceComponentAction(new ic74x245()));
};

(window as any).clearActionsHistory = function () {
  localStorage.setItem('actions_history', JSON.stringify([]));
  location.reload();
};

(window as any).addOrthogonal = function() {
  workspace.current(new AddWireAction());
};

(window as any).toolSelect = function() {
  workspace.current(new SelectAction());
};

(window as any).deleteSelection = deleteSelection;

(window as any).moveSelection = function() {
  workspace.current(new MoveSelectionAction());
};



(window as any).downloadScene = function() {
  var text = JSON.stringify(workspace.serialize()),
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
  workspace.current(new DeleteSelectionAction());
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
  workspace.cancelCurrent();
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