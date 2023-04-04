import '@webcomponents/scoped-custom-element-registry';

import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  AppAgentWebsocket,
  AppWebsocket,
  CellInfo, CellType,
  ActionHash,
  AppInfo,
  AdminWebsocket,
  encodeHashToBase64,
  ProvisionedCell,
  ClonedCell,
} from '@holochain/client';
import { CircularProgress } from '@scoped-elements/material-web';
import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin";
import { provideGraphQLClient, ApolloClient, NormalizedCacheObject } from './provider-graphql-client';
import { SensemakerService, SensemakerStore } from '@neighbourhoods/nh-launcher-applet';
import { CreateOrJoinNh } from '@neighbourhoods/component-create-or-join-nh';
import { LoadingMessage } from '@neighbourhoods/component-loading-message';
import { ProviderApp } from './provider-app';
import appletConfig from './appletConfig'

// duplicate rendering redone in `provider-app` but needed here in order to initially style NH setup components.
import cssThemeVars from '@neighbourhoods/applet-vf-timetracker-theme-vars'

const HOLOCHAIN_APP_ID = "provider-sensemaker"
const SENSEMAKER_ROLE_NAME = "sensemaker"
const PROVIDER_ROLE_NAME = "hrea_observation_0" // :WARNING: this will mean cloned sensemaker cell uses same agentPubKey as plugged Observation cell

@customElement('provider-app-test-harness')
export class ProviderAppTestHarness extends ScopedElementsMixin(LitElement) {
  @state() loading = true;

  @state() actionHash: ActionHash | undefined;

  @state() currentSelectedList: string | undefined;

  @property({ type: Object })
  appWebsocket!: AppWebsocket;

  @property({ type: Object })
  adminWebsocket!: AdminWebsocket;

  @property({ type: Object })
  appInfo!: AppInfo;

  @property()
  _graphql!: ApolloClient<NormalizedCacheObject>;

  @property()
  _sensemakerStore!: SensemakerStore;

  @property()
  isSensemakerCloned: boolean = false;

  @property()
  agentPubkey!: string;

  // on the first update, setup any networking connections required for app execution
  async firstUpdated() {
    // connect to the conductor
    try {
      await this.connectHolochain()

      // detect participant agentPubKey from primary hREA provider cell
      const providerCellInfo: CellInfo = this.appInfo.cell_info[PROVIDER_ROLE_NAME][0]

      if (providerCellInfo) {
        // @ts-ignore
        const providerCell: ProvisionedCell = (providerCellInfo as { [CellType.Provisioned]: ProvisionedCell })[CellType.Provisioned];
        this.agentPubkey = encodeHashToBase64(providerCell.cell_id[1])
      } else {
        throw new Error("Unable to detect hREA Observation cell during startup")
      }

      const installedSensemakerCells = (this.appInfo as AppInfo).cell_info[SENSEMAKER_ROLE_NAME]

      // check if sensemaker has been cloned yet
      const allSensemakerClones = installedSensemakerCells.filter((cellInfo) => CellType.Cloned in cellInfo);
      if (allSensemakerClones.length > 0) {
        this.isSensemakerCloned = true;
        const clonedSensemakerCell = (allSensemakerClones[0] as { [CellType.Cloned]: ClonedCell }).cloned;
        const clonedSensemakerRoleName = clonedSensemakerCell.clone_id!;
        await this.initializeSensemakerStore(clonedSensemakerRoleName);
        const _todoConfig = await this._sensemakerStore.checkIfAppletConfigExists(appletConfig.name)
        console.info('APP CONF', _todoConfig)
      }

      // construct the provider connector
      this._graphql = await provideGraphQLClient({
        conductorUri: this.appWebsocket.client.socket.url,
        // adminConductorUri: this.adminWebsocket.client.socket.url,
      });

      this.loading = false;
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  async initializeSensemakerStore(clonedSensemakerRoleName: string) {
    const appAgentWebsocket: AppAgentWebsocket = await AppAgentWebsocket.connect(this.appWebsocket.client.socket.url, this.appInfo.installed_app_id, 60000);
    const sensemakerService = new SensemakerService(appAgentWebsocket, clonedSensemakerRoleName)
    this._sensemakerStore = new SensemakerStore(sensemakerService);
  }

  async cloneSensemakerCell(ca_pubkey: string) {
    const clonedSensemakerCell: ClonedCell = await this.appWebsocket.createCloneCell({
      app_id: this.appInfo.installed_app_id,
      role_name: SENSEMAKER_ROLE_NAME,
      modifiers: {
        network_seed: '',
        properties: {
          sensemaker_config: {
            neighbourhood: "todo test",
            wizard_version: "v0.1",
            community_activator: ca_pubkey
          },
          applet_configs: [],
        },
      },
      name: `${SENSEMAKER_ROLE_NAME}-clone`,
    });
    this.isSensemakerCloned = true;
    await this.initializeSensemakerStore(clonedSensemakerCell.clone_id)
  }

  async createNeighbourhood(_e: CustomEvent) {
    await this.cloneSensemakerCell(this.agentPubkey)
    try {
      const _todoConfig = await this._sensemakerStore.registerApplet(appletConfig);
      console.info('APP CONF', _todoConfig)
    } catch (e) {
      console.error('Error registering default applet configuration with Sensemaker store', e)
    }
    this.loading = false;
  }

  async joinNeighbourhood(e: CustomEvent) {
    await this.cloneSensemakerCell(e.detail.newValue)
    console.log('successfully cloned sensemaker cell')
    // wait some time for the dht to sync, otherwise checkIfAppletConfigExists returns null
    setTimeout(async () => {
      try {
        const _todoConfig = await this._sensemakerStore.checkIfAppletConfigExists(appletConfig.name)
        console.info('APP CONF', _todoConfig)
      } catch (e) {
        console.error('Error loading existing applet configuration from Sensemaker store', e)
      }
      this.loading = false;
    }, 2000)
  }

  render() {
    if (this.isSensemakerCloned && this.loading)
      return html`
        <main><loading-message>Connecting to Neighbourhood...</loading-message></main>
      `;
    if (!this.isSensemakerCloned)
      return html`
        <main><create-or-join-nh @create-nh=${this.createNeighbourhood} @join-nh=${this.joinNeighbourhood}></create-or-join-nh></main>
      `;
    return html`
      <main>
        <h3>My Pubkey: <code>${this.agentPubkey}</code></h3>
        <div class="home-page">
          <provider-app .sensemakerStore=${this._sensemakerStore} .graphqlClient=${this._graphql}></provider-app>
        </div>
      </main>
    `;
  }

  async connectHolochain() {
    this.adminWebsocket = await AdminWebsocket.connect(``);

    this.appWebsocket = await AppWebsocket.connect(``, 60000);

    this.appInfo = await this.appWebsocket.appInfo({
      installed_app_id: HOLOCHAIN_APP_ID,
    });
  }

  static get elementDefinitions() {
    return {
      'provider-app': ProviderApp,
      'create-or-join-nh': CreateOrJoinNh,
      'mwc-circular-progress': CircularProgress,
      'loading-message': LoadingMessage,
    };
  }

  static styles = css`
    ${cssThemeVars}

    :host {
      min-height: 100vh;
      font-size: calc(10px + 2vmin);
      max-width: 960px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
    }

    main {
      flex: 1;
      display: flex;
      align-items: center;
      flex-direction: column;
      justify-content: flex-start;
    }
    main h3 {
      flex-grow: 0;
      max-width: 100%;
    }
    main code {
      font-size: 0.5em;
      font-weight: normal;
    }

    .home-page {
      flex-grow: 1;
    }
  `;
}
