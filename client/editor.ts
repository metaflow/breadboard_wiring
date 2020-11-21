import Konva from 'konva';
import hotkeys from 'hotkeys-js';
import { appActions } from './action';
import { stage, defaultLayer, actionLayer, gridAlignment, fullState, clearStage } from './stage';
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
  appActions.current(new PlaceComponentAction(new ic74x245()));
};

(window as any).clearActionsHistory = function () {
  localStorage.setItem('actions_history', JSON.stringify([]));
  location.reload();
};

(window as any).addOrthogonal = function() {
  appActions.current(new AddWireAction());
};

(window as any).toolSelect = function() {
  appActions.current(new SelectAction());
};

(window as any).deleteSelection = deleteSelection;

(window as any).moveSelection = function() {
  appActions.current(new MoveSelectionAction());
};

interface EditorFile {
  state: any;
  history: any;
}

(window as any).downloadScene = function() {
  var a: EditorFile = {
      state: fullState(),
      history: appActions.serialize(),
    },
    text = JSON.stringify(a),
    blob = new Blob([text], { type: 'text/plain' }),
    anchor = document.createElement('a');

  anchor.download = "myscheme.bbw";
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
      let f = JSON.parse(s) as EditorFile;
      clearStage();
      appActions.load(f.history);
      fileSelector.value = '';
    }
  });
  reader.readAsText(file);
});

function deleteSelection() {
  appActions.current(new DeleteSelectionAction());
  appActions.commit();
}

// first we need to create a stage
stage(new Konva.Stage({
  container: 'container',   // id of container <div>
  width: 700,
  height: 700,
}));

stage()!.container().style.backgroundColor = theme.backgroud;

document.getElementById('container')?.addEventListener('contextmenu', e => {
  e.preventDefault()
});

stage()?.add(defaultLayer(new Konva.Layer()));
stage()?.add(actionLayer(new Konva.Layer()));

stage()?.on('mousemove', function (e: Konva.KonvaEventObject<MouseEvent>) {
  appActions.onMouseMove(e);
});

// function log(style: string, m: string) {
//   const p = document.createElement('p');
//   p.classList.add(style);
//   p.innerText = m;
//   document.getElementById('log')?.appendChild(p);
// }

// for (let i = 0; i < 10; i++) log("error", "stage()?.on('mousemove', function (e: Konva.KonvaEventObject<MouseEvent>)");
// for (let i = 0; i < 10; i++) log("info", "stage()?.on('mousemove', function (e: Konva.KonvaEventObject<MouseEvent>)");

stage()?.on('mousedown', function (e) {
  e.evt.preventDefault(); // Disable scroll on middle button click.
  if (appActions.onMouseDown(e)) {
    return;
  }
  // No action.  
  if (e.evt.button != 0 && selection().length > 0) {
    const a = new SelectAction();
    appActions.current(a);
    appActions.commit();
  }
});

stage()?.on('mouseup', function(e) { appActions.onMouseUp(e); });

hotkeys('esc', function (e) {
  e.preventDefault();
  appActions.cancelCurrent();
});

hotkeys('ctrl+z', function (e) {
  e.preventDefault();
  appActions.undo();
});

hotkeys('ctrl+y', function (e) {
  e.preventDefault();
  appActions.redo();
});

hotkeys('del', function (e) {
  deleteSelection();
});

gridAlignment(5); // TODO: make grid algnment change an action.
appActions.load();