import type { Lang } from '../../src/langs.ts';
import type { SeoText } from '../text.ts';
import ar from './ar.ts';
import bg from './bg.ts';
import bn from './bn.ts';
import cs from './cs.ts';
import da from './da.ts';
import de from './de.ts';
import el from './el.ts';
import en from './en.ts';
import es from './es.ts';
import et from './et.ts';
import fa from './fa.ts';
import fi from './fi.ts';
import fil from './fil.ts';
import fr from './fr.ts';
import he from './he.ts';
import hi from './hi.ts';
import hr from './hr.ts';
import hu from './hu.ts';
import id from './id.ts';
import it from './it.ts';
import ja from './ja.ts';
import ko from './ko.ts';
import lt from './lt.ts';
import lv from './lv.ts';
import ms from './ms.ts';
import nb from './nb.ts';
import nl from './nl.ts';
import pl from './pl.ts';
import ptBR from './pt-BR.ts';
import ptPT from './pt-PT.ts';
import ro from './ro.ts';
import ru from './ru.ts';
import sk from './sk.ts';
import sl from './sl.ts';
import sr from './sr.ts';
import sv from './sv.ts';
import sw from './sw.ts';
import th from './th.ts';
import tr from './tr.ts';
import uk from './uk.ts';
import ur from './ur.ts';
import vi from './vi.ts';
import zhCN from './zh-CN.ts';
import zhTW from './zh-TW.ts';

/** Every language's words; a missing one is a type error. */
export const TEXTS: Record<Lang, SeoText> = {
  fr, en, es, 'pt-BR': ptBR, 'pt-PT': ptPT, de, it, nl, sv, da, nb, fi, et, lv, lt, pl, cs, sk, hu, ro, bg, el,
  hr, sr, sl, uk, ru, tr, ar, he, fa, ja, ko, 'zh-CN': zhCN, 'zh-TW': zhTW, hi, bn, ur, id, ms, th, vi, fil, sw,
};
