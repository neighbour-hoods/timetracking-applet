import { LitElement, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { provide } from '@lit-labs/context';
import { ScopedRegistryHost as ScopedElementsMixin } from "@lit-labs/scoped-registry-mixin";
import { get } from 'svelte/store';

import { SensemakerStore } from '@neighbourhoods/nh-launcher-applet';
import { ComputeContextInput } from '@neighbourhoods/sensemaker-lite-types';

import { sensemakerStoreContext } from './contexts';
import { ApolloClientElement, ApolloClient, NormalizedCacheObject } from './provider-graphql-client.js';

import { AgentProfileCheck } from '@vf-ui/component-agent-profile-check'
import { AgentProfileManage } from '@vf-ui/component-agent-profile-manage'
import { TimesheetEntriesList } from '@neighbourhoods/component-time-entries-list'
import { ProvideTimeUnits } from '@vf-ui/component-provide-time-units'
import { WorkInputManual } from '@vf-ui/component-work-input-daily'
import cssThemeVars from '@neighbourhoods/applet-vf-timetracker-theme-vars'

// :TODO: wire up to light/dark themeing
// @ts-ignore
import shoelaceTheme from '@shoelace-style/shoelace/dist/themes/light.styles.js'
// wire up Shoelace component assets
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js'
setBasePath('/shoelace');

export class ProviderApp extends ScopedElementsMixin(LitElement) {
  // set up context provider for sensemaker store so it can be accessed by other components
  @provide({ context: sensemakerStoreContext })
  @property()
  sensemakerStore!: SensemakerStore;

  // no context needed for GraphQL Client object; we'll use the `ApolloClientElement` for that
  @property()
  graphqlClient!: ApolloClient<NormalizedCacheObject>;

  render() {
    return html`
      <apollo-client .client=${this.graphqlClient}>
        <agent-profile-check>

          <agent-profile-manage slot="profile-missing" @agentProfileCreated=${this.onProfileCreated}></agent-profile-manage>

          <provide-time-units slot="profile-ok">
            <work-input-manual @economicEventCreated=${this.onWorkLogged}></work-input-manual>
          </provide-time-units>
          <timesheet-entries-list slot="profile-ok" viewContext="most_verified_work"></timesheet-entries-list>

        </agent-profile-check>
      </apollo-client>
    `;
  }

  /**
   * Requery agent profiles in AgentProfileCheck component when
   * profile is created in AgentProfileManage.
   *
   * @see https://github.com/apollo-elements/apollo-elements/issues/39#issuecomment-476272681
   */
  async onProfileCreated(_e: CustomEvent) {
    if (!this.shadowRoot) {
      return
    }

    const profileCheck: AgentProfileCheck | null = this.shadowRoot.querySelector('agent-profile-check')
    if (profileCheck) {
      profileCheck.me.subscribe({ fetchPolicy: 'cache-only' })
    }
    const workInput: WorkInputManual | null = this.shadowRoot.querySelector('work-input-manual')
    if (workInput) {
      workInput.me.subscribe({ fetchPolicy: 'cache-only' })
    }
  }

  /**
   * Requery timesheet entries list in TimesheetEntriesList component when
   * entry is created in WorkInputManual.
   *
   * @see https://github.com/apollo-elements/apollo-elements/issues/39#issuecomment-476272681
   */
  async onWorkLogged(_e: CustomEvent) {
    if (!this.shadowRoot) {
      return
    }

    const entriesList: TimesheetEntriesList | null = this.shadowRoot.querySelector('timesheet-entries-list')
    if (entriesList) {
      entriesList.list?.entries?.subscribe({ fetchPolicy: 'cache-only' })
    }
  }

  static get scopedElements() {
    return {
      'apollo-client': ApolloClientElement,
      'agent-profile-check': AgentProfileCheck,
      'agent-profile-manage': AgentProfileManage,
      'timesheet-entries-list': TimesheetEntriesList,
      'provide-time-units': ProvideTimeUnits,
      'work-input-manual': WorkInputManual,
    };
  }

  static styles = css`
    ${shoelaceTheme}
    ${cssThemeVars}

    // prevent FoUC with customElements
    :not(:defined) {
      visibility: hidden;
    }
  `;
}
