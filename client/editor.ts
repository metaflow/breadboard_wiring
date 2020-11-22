import Konva from 'konva';
import hotkeys from 'hotkeys-js';
import { appActions } from './action';
import { stage, defaultLayer, gridAlignment, fullState, clearStage, stageUpdated, Point } from './stage';
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
  width: window.screen.width,
  height: window.screen.height,
}));

stage()!.container().style.backgroundColor = theme.backgroud;

document.getElementById('container')?.addEventListener('contextmenu', e => {
  e.preventDefault()
});

stage()?.add(defaultLayer(new Konva.Layer()));
defaultLayer()?.scaleX(2);
defaultLayer()?.scaleY(2);

let draggingScene = false;
let draggingOrigin = new Point();
let initialOffset = new Point();

stage()?.on('mousemove', function (e: Konva.KonvaEventObject<MouseEvent>) {
  appActions.onMouseMove(e);
  if (draggingScene) {
    const sx = defaultLayer()?.scaleX();
    if (!sx) return;
    let p = Point.screenCursor().sub(draggingOrigin).s(-1/sx).add(initialOffset);
    // TODO: make drag a part of actions, merge action.ts with stage.ts
    defaultLayer()?.offset(p);
    stageUpdated(); // TODO: rename to "redraw".
  }
});

stage()?.on('wheel', function(e : Konva.KonvaEventObject<WheelEvent>) {
  let d = (e.evt.deltaY < 0) ? (1/1.1) : 1.1;
  let x = defaultLayer()?.scaleX();
  if (!x) return;
  let c = Point.cursor();
  x *= d;
  defaultLayer()?.scaleX(x);
  defaultLayer()?.scaleY(x);
  defaultLayer()?.offset(c.sub(Point.cursor()).add(new Point(defaultLayer()?.offset())));
  stageUpdated();
});

stage()?.on('mousedown', function (e) {
  e.evt.preventDefault(); // Disable scroll on middle button click.
  if (appActions.onMouseDown(e)) {
    return;
  }
  // Deselect on right click.
  if (e.evt.button == 2 && selection().length > 0) {
    const a = new SelectAction();
    appActions.current(a);
    appActions.commit();
  }
  if (e.evt.button == 1) {
    draggingScene = true;
    draggingOrigin = Point.screenCursor();
    initialOffset = new Point(defaultLayer()?.offsetX(), defaultLayer()?.offsetY());
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

gridAlignment(15);
appActions.load();