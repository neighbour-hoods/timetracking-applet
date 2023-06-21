import { property, state } from "lit/decorators.js";
import { CircularProgress } from "@scoped-elements/material-web";
import { html, css } from "lit";
import { AppletInfo, SensemakerStore } from "@neighbourhoods/nh-launcher-applet";
import { ProviderApp, ApolloClient, provideGraphQLClient } from "@neighbourhoods/timetracking-applet";
import type { NormalizedCacheObject } from "@neighbourhoods/timetracking-applet";
import appletConfig from './appletConfig';
import { AppAgentWebsocket, AppWebsocket, AdminWebsocket } from "@holochain/client";
import { NHComponent } from 'neighbourhoods-design-system-components/dist/components/base'

const PROVIDER_ROLE_NAME = 'provider';

export class ProviderApplet extends NHComponent {
  @property()
  appletAppInfo!: AppletInfo[];

  @property()
  appWebsocket!: AppWebsocket;

  @property()
  adminWebsocket!: AdminWebsocket;

  @property()
  sensemakerStore!: SensemakerStore;

  @property()
  graphqlClient!: ApolloClient<NormalizedCacheObject>;

  @state()
  loaded = false;

  async firstUpdated() {
    try {
      const maybeAppletConfig = await this.sensemakerStore.checkIfAppletConfigExists(appletConfig.name)
      if (!maybeAppletConfig) {
        await this.sensemakerStore.registerApplet(appletConfig)
      }

      // construct the provider connector
      this.graphqlClient = await provideGraphQLClient({
        conductorUri: this.appWebsocket.client.socket.url,
        // adminConductorUri: this.adminWebsocket.client.socket.url,
      });
      this.loaded = true;
    }
    catch (e) {
      console.log("error in first update", e)
    }
  }
  static styles = css`
    .completed {
      text-decoration-line: line-through;
      color: #777;
    }
  `;

  render() {
    if (!this.loaded)
      return html`<div
        style="display: flex; flex: 1; flex-direction: row; align-items: center; justify-content: center"
      >
        <mwc-circular-progress></mwc-circular-progress>
      </div>`;

    return html`
      <provider-app .sensemakerStore=${this.sensemakerStore} .graphqlClient=${this.graphqlClient}></provider-app>
    `;
  }

  static get elementDefinitions() {
    return {
      "mwc-circular-progress": CircularProgress,
      "provider-app": ProviderApp,
    };
  }
}
