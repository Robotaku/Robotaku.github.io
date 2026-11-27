/** エントリポイント。画面の組み立ては ui/app.ts に任せる。 */
import { startApp } from './ui/app';

startApp(document.getElementById('app')!);
