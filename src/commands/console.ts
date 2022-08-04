import { Command } from '@oclif/command';
import * as path from 'path';
import * as repl from 'repl';
import * as terrajs from '@terra-money/terra.js';
import { getEnv } from '../lib/env';
import { signer, network, terrainPaths } from '../lib/flag';

// Needed for Terrain to be able to require typescript modules.
require('ts-node').register({
  // Don't actually check types of libs.
  transpileOnly: true,
  // Make sure we don't double transpile source code.
  ignore: ['(?:^|/)node_modules/', 'src/commands/.*\\.ts', 'src/lib/.*\\.ts'],
});

export default class Console extends Command {
  static description = 'Start a repl console that provides context and convenient utilities to interact with the blockchain and your contracts.';

  static flags = {
    signer,
    network,
    ...terrainPaths,
  };

  static args = [];

  async run() {
    const { flags } = this.parse(Console);
    const fromCwd = (p: string) => path.join(process.cwd(), p);

    const env = getEnv(
      fromCwd(flags['config-path']),
      fromCwd(flags['keys-path']),
      fromCwd(flags['refs-path']),
      flags.network,
      flags.signer,
    );

    // eslint-disable-next-line global-require, import/no-dynamic-require
    let Lib = require(path.join(process.cwd(), 'lib'));

    let libInstance;

    // Detect if a default export exists and use that.
    if (Lib?.default) {
      Lib = Lib.default;
    }

    // Need the new keyword if Lib is a class.
    if (typeof Lib === 'function' && Lib.prototype?.constructor) {
      libInstance = new Lib(env);
    } else {
      libInstance = Lib(env);
    }

    // for repl server
    const {
      config, refs, wallets, client,
    } = env;

    const r = repl.start({ prompt: 'terrain > ', useColors: true });

    const def = (name: string, value: any) => Object.defineProperty(r.context, name, {
      configurable: false,
      enumerable: true,
      value,
    });

    def('config', config);
    def('refs', refs);
    def('wallets', wallets);
    def('client', client);
    def('terrajs', terrajs);
    def('lib', libInstance);
  }
}
