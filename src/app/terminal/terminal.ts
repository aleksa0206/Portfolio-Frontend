import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ContentService } from '../core/services/content.service';
import { ReadmeService } from '../core/services/readme.service';
import { PROFILE } from '../core/constants/profile';
import { COMMAND_NAMES, Line, Seg, execute, textLines } from './commands';
import { splitCode } from '../core/constants/site-texts';
import { complete } from './complete';
import { PortfolioData, buildFs } from './portfolio-fs';
import { HOME, displayPath } from './vfs';
import { OutputLine } from './output-line';

interface Entry {
  prompt?: string;
  command?: string;
  out: Line[];
  welcome?: true; // rendered from welcome(), so it updates once the About text loads
}

// Admin text where `backticked` commands are highlighted, as in the old hardcoded hint
function hintLines(text: string): Line[] {
  return text
    .split('\n')
    .map((l) => splitCode(l).map((p): Seg => (p.code ? { text: p.text, tone: 'accent' } : { text: p.text })));
}

@Component({
  imports: [OutputLine],
  selector: 'app-terminal',
  styleUrl: './terminal.scss',
  templateUrl: './terminal.html',
})
export class TerminalComponent {
  private content = inject(ContentService);
  private readmeService = inject(ReadmeService);
  private router = inject(Router);
  private injector = inject(Injector);

  private inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private screenRef = viewChild.required<ElementRef<HTMLElement>>('screen');

  cwd = signal(HOME);
  prompt = computed(() => `${PROFILE.user}@${PROFILE.host}:${displayPath(this.cwd())}$`);
  title = computed(() => `${PROFILE.user}@${PROFILE.host}: ${displayPath(this.cwd())}`);
  entries = signal<Entry[]>([{ welcome: true, out: [] }]);
  welcome = computed<Line[]>(() => {
    const hint = [...hintLines(this.content.text('terminal.hint')), []];
    return this.content.isLoading()
      ? hint
      : [...textLines(this.content.text('terminal.welcome')), ...hint];
  });
  value = signal('');
  busy = signal(false);

  private history: string[] = [];
  private historyIndex = 0; // === history.length means "editing a new line"
  private draft = '';
  private prevCwd = HOME;

  private data = computed<PortfolioData>(() => ({
    about: this.content.about(),
    projects: this.content.projects(),
    education: this.content.education(),
    licenses: this.content.licenses(),
    location: this.content.location(),
    github: this.content.github(),
    readme: (url) => firstValueFrom(this.readmeService.get(url)),
  }));
  private root = computed(() => buildFs(this.data()));

  constructor() {
    // Autofocus only with a real pointer, so phones don't pop the keyboard on load.
    afterNextRender(() => {
      if (matchMedia('(pointer: fine)').matches) this.focus();
    });
  }

  focus() {
    this.inputRef().nativeElement.focus({ preventScroll: true });
  }

  // Runs a command as if it had been typed (used by the sidebar).
  run(command: string) {
    this.value.set(command);
    this.submit();
  }

  focusIfNoSelection() {
    if (!getSelection()?.toString()) this.focus();
  }

  onInput(event: Event) {
    this.value.set((event.target as HTMLInputElement).value);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.submit();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.browseHistory(event.key === 'ArrowUp' ? -1 : 1);
    } else if (event.key === 'Tab' && this.value()) {
      // Empty line: let Tab move focus normally so keyboard users aren't trapped.
      event.preventDefault();
      this.tab();
    } else if (event.ctrlKey && event.key === 'l') {
      event.preventDefault();
      this.entries.set([]);
    } else if (event.ctrlKey && event.key === 'c' && !getSelection()?.toString()) {
      event.preventDefault();
      this.entries.update((e) => [
        ...e,
        { prompt: this.prompt(), command: this.value() + '^C', out: [] },
      ]);
      this.value.set('');
      this.scrollToEnd();
    }
  }

  tab() {
    const { value, options } = complete(this.value(), this.root(), this.cwd(), COMMAND_NAMES);
    if (options.length) {
      this.entries.update((e) => [
        ...e,
        { prompt: this.prompt(), command: value, out: [[{ text: options.join('  ') }]] },
      ]);
    }
    this.setValue(value);
    this.scrollToEnd();
  }

  browseHistory(direction: -1 | 1) {
    const next = this.historyIndex + direction;
    if (next < 0 || next > this.history.length) return;
    if (this.historyIndex === this.history.length) this.draft = this.value();
    this.historyIndex = next;
    this.setValue(next === this.history.length ? this.draft : this.history[next]);
  }

  async submit() {
    if (this.busy()) return;
    const command = this.value();
    const entry: Entry = { prompt: this.prompt(), command, out: [] };
    this.value.set('');
    if (command.trim() && this.history.at(-1) !== command) this.history.push(command);
    this.historyIndex = this.history.length;
    this.entries.update((e) => [...e, entry]);
    this.scrollToEnd();

    let cleared = false;
    this.busy.set(true);
    const out = await execute(command, {
      root: this.root(),
      cwd: this.cwd(),
      prevCwd: this.prevCwd,
      setCwd: (path) => {
        this.prevCwd = this.cwd();
        this.cwd.set(path);
      },
      history: this.history,
      data: this.data(),
      cols: this.cols(),
      open: (route) => this.router.navigateByUrl(route),
      clear: () => (cleared = true),
    });
    this.busy.set(false);
    this.entries.update((e) => (cleared ? [] : e.map((x) => (x === entry ? { ...x, out } : x))));
    this.scrollToEnd();
  }

  // ponytail: assumes 0.6em glyph width of the mono font at 14px; measure if the font changes
  private cols() {
    return Math.floor(this.screenRef().nativeElement.clientWidth / 8.4);
  }

  private setValue(value: string) {
    this.value.set(value);
    afterNextRender(
      () => {
        const input = this.inputRef().nativeElement;
        input.setSelectionRange(value.length, value.length);
      },
      { injector: this.injector },
    );
  }

  private scrollToEnd() {
    afterNextRender(
      () => {
        const screen = this.screenRef().nativeElement;
        screen.scrollTop = screen.scrollHeight;
      },
      { injector: this.injector },
    );
  }
}
