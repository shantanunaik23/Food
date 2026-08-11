/**
 * The assembled content library.
 *
 * This is the only module the UI should import content from. Everything is
 * frozen: user state lives separately and references content by id, so nothing
 * in the app is entitled to mutate the library at runtime.
 */

import type { Library } from './types';
import { ingredients } from './ingredients';
import { preparations } from './preparations';
import { bases } from './bases';
import { dishes } from './dishes';
import { techniques } from './techniques';

export const library: Library = Object.freeze({
  ingredients,
  preparations,
  bases,
  dishes,
  techniques,
});

export { ingredients, preparations, bases, dishes, techniques };
export * from './types';
