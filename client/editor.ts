import Konva from 'konva';
import hotkeys from 'hotkeys-js';
import { appActions } from './action';
import { stage, defaultLayer, actionLayer, gridAlignment, fullState, clearStage, stageUpdated, PlainPoint, Point, PhysicalPoint, ScreenPoint } from './stage';
import { SelectAction } from './actions/select_action';
import { ic74x245 } from './components/74x245';
import { PlaceComponentAction } from './actions/add_ic_action';
import { AddWireAction } from './actions/add_wire';
import { selection } from './components/selectable_component';
import { DeleteSelectionAction } from './actions/delete_action';
import { MoveSelectionAction } from './actions/move_selection';
import { error, typeGuard } from './utils';
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

let draggingScene = false;
let draggingOrigin = new ScreenPoint();
let initialOffset = new ScreenPoint();

stage()?.on('mousemove', function (e: Konva.KonvaEventObject<MouseEvent>) {
  appActions.onMouseMove(e);
  if (draggingScene) {
    console.log(e.evt);
    const sx = defaultLayer()?.scaleX();
    if (!sx) return;
    let d = ScreenPoint.cursor().sub(draggingOrigin).s(-1/sx).add(initialOffset);
    // TODO: make drag a part of actions, merge action.ts with stage.ts, update calculations of screen point, affect actions level too
    defaultLayer()?.offsetX(d.getX());
    defaultLayer()?.offsetY(d.getY());
    stageUpdated(); // TODO: rename to "redraw".
  }
});

stage()?.on('wheel', function(e : Konva.KonvaEventObject<WheelEvent>) {
  let d = (e.evt.deltaY < 0) ? 0.9 : 1.1;
  let x = defaultLayer()?.scaleX();
  if (!x) return;
  defaultLayer()?.scaleX(x * d);
  defaultLayer()?.scaleY(x * d);
  stageUpdated();
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
  // Deselect on right click.
  console.log(ScreenPoint.cursor());
  if (e.evt.button == 2 && selection().length > 0) {
    const a = new SelectAction();
    appActions.current(a);
    appActions.commit();
  }
  if (e.evt.button == 1) {
    draggingScene = true;
    draggingOrigin = ScreenPoint.cursor();
    initialOffset = new ScreenPoint(defaultLayer()?.offsetX(), defaultLayer()?.offsetY());
  }
});

stage()?.on('mouseup', function(e) {
  appActions.onMouseUp(e); 
  draggingScene = false;
});

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