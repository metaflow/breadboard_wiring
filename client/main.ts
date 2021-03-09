import Konva from 'konva';
import hotkeys from 'hotkeys-js';
import { PHYSICAL, physicalLayer, schemeLayer, gridAlignment, SCHEME, stage, workspace } from './workspace';
import { ic74x245 } from './components/74x245';
import { onError, typeGuard } from './utils';
import theme from '../theme.json';
import { AddWireInteraction } from './actions/add_wire';
import { SelectInteraction } from './actions/select';
import { MoveSelectionInteraction } from './actions/move_selection';
import { DeleteComponentsMutation } from './actions/delete_action';
import { selectionAddresses, selectionRoots } from './components/selectable_component';
import { ComponentSpec, deserializeComponent } from './components/component';
import { AddComponentInteraction } from './actions/add_ic_action';
import Split from 'split.js';
import { Breadboard } from './components/breadboard';
 
window.onerror = (errorMsg, url, lineNumber) => {
  onError(errorMsg, url, lineNumber);
  return false;
};

(window as any).add245 = function () {
  new AddComponentInteraction([new ic74x245()]);
};

(window as any).add245physical = function () {
  console.log('add245physical');
  const c = new ic74x245();
  c.stageName = PHYSICAL;
  new AddComponentInteraction([c]);
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
  new SelectInteraction(SCHEME);
};

(window as any).selectPhysical = function() {
  workspace.cancelInteractions();
  new SelectInteraction(PHYSICAL);
};

(window as any).deleteSelection = deleteSelection;

(window as any).moveSelection = function() {
  workspace.cancelInteractions();
  new MoveSelectionInteraction();
};

(window as any).downloadSchematic = function() {
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

(window as any).addBreadboard = () => {
  const c = new Breadboard();
  c.stageName = PHYSICAL;
  new AddComponentInteraction([c]);
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
  const cc = selectionRoots().map(c => c.serialize());
  workspace.update(new DeleteComponentsMutation(cc, selectionAddresses()));
}

// first we need to create a stage
stage(SCHEME, new Konva.Stage({
  container: 'scheme',
  width: window.screen.width,
  height: window.screen.height,
}));
stage(SCHEME).container().style.backgroundColor = theme.backgroud;
stage(SCHEME).add(schemeLayer(new Konva.Layer()));
schemeLayer().scaleX(2);
schemeLayer().scaleY(2);

stage(SCHEME, new Konva.Stage({
  container: 'physical',
  width: window.screen.width,
  height: window.screen.height,
}));
stage(PHYSICAL).container().style.backgroundColor = theme.backgroud;
stage(PHYSICAL).add(physicalLayer(new Konva.Layer()));
physicalLayer().scaleX(2);
physicalLayer().scaleY(2);

document.getElementById('scheme')?.addEventListener('contextmenu', e => {
  e.preventDefault()
});

document.getElementById('physical')?.addEventListener('contextmenu', e => {
  e.preventDefault()
});

workspace.setupEvents();

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

hotkeys('ctrl+c', function () {
  const ss = selectionRoots().map(c => {
    const s: ComponentSpec = c.serialize();
    delete(s.id);
    return s;
  });
  if (ss.length == 0) return;
  const t = JSON.stringify(ss);  
  navigator.clipboard.writeText(t).catch(() => {
    throw new Error('failed to write to clipboard');
  });
});

hotkeys('ctrl+x', function () {
  const ss = selectionRoots().map(c => {
    const s: ComponentSpec = c.serialize();
    delete(s.id);
    return s;
  });
  if (ss.length == 0) return;
  const t = JSON.stringify(ss);  
  navigator.clipboard.writeText(t).catch(() => {
    throw new Error('failed to write to clipboard');
  });
  deleteSelection();
});

hotkeys('ctrl+v', function () {  
  navigator.clipboard.readText().then(txt => {
    const ss = JSON.parse(txt);
    new AddComponentInteraction(ss.map((a: ComponentSpec) => {
      return deserializeComponent(a);
    }));
  });
});

gridAlignment(15);
workspace.loadFromLocalHistory();

Split(['#scheme-area', '#physical-area'], {
  minSize: 100,
  gutterSize: 3,
  direction: 'vertical',
});