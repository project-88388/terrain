import { Command, flags } from '@oclif/command';
import { LCDClient } from '@terra-money/terra.js';
import { loadConfig, loadConnections } from '../../config';
import { migrate, storeCode } from '../../lib/deployment';
import { getSigner } from '../../lib/signer';
import * as flag from '../../lib/flag';

export default class ContractMigrate extends Command {
  static description = 'Migrate the contract.';

  static flags = {
    signer: flag.signer,
    'no-rebuild': flag.noRebuild,
    network: flags.string({ default: 'localterra' }),
    'config-path': flags.string({ default: './config.terrain.json' }),
    'refs-path': flags.string({ default: './refs.terrain.json' }),
    'keys-path': flags.string({ default: './keys.terrain.js' }),
    'instance-id': flags.string({ default: 'default' }),
    'code-id': flags.integer({
      description:
        'target code id for migration',
    }),
    arm64: flags.boolean({
      description: 'use rust-optimizer-arm64 for optimization. Not recommended for production, but it will optimize quicker on arm64 hardware during development.',
      default: false,
    }),
  };

  static args = [{ name: 'contract', required: true }];

  async run() {
    const { args, flags } = this.parse(ContractMigrate);

    const connections = loadConnections(flags['config-path']);
    const config = loadConfig(flags['config-path']);
    const conf = config(flags.network, args.contract);

    // @ts-ignore
    const lcd = new LCDClient(connections(flags.network));
    const signer = getSigner({
      network: flags.network,
      signerId: flags.signer,
      keysPath: flags['keys-path'],
      lcd,
    });

    const codeId = await storeCode({
      conf,
      noRebuild: flags['no-rebuild'],
      contract: args.contract,
      signer,
      network: flags.network,
      refsPath: flags['refs-path'],
      lcd,
      arm64: flags.arm64,
    });

    migrate({
      conf,
      signer,
      contract: args.contract,
      codeId,
      network: flags.network,
      instanceId: flags['instance-id'],
      refsPath: flags['refs-path'],
      lcd,
    });
  }
}
