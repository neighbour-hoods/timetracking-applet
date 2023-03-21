/**
 * Simplified input to manage `ResourceSpecifications` used as a means of classifying
 * and identifying work types.
 *
 * Includes an autocomplete to select from the existing `ResourceSpecifications` in the
 * network; and 'add new' functionality to create new specs that have not been considered yet.
 *
 * :TODO: add a button for spec creation; rather than only triggering on Enter/Tab keypress
 * :TODO: provide edit functionality
 *
 * @package Neighbourhoods/We Timesheet applet
 * @since   2023-02-15
*/
import { property, state, query } from "lit/decorators.js"
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { ApolloMutationController, ApolloQueryController } from '@apollo-elements/core'

import { LoadingMessage } from "@neighbourhoods/component-loading-message"
import { ErrorDisplay } from "@neighbourhoods/component-error-display"
import { TextField, TextArea, List, ListItem, Button } from '@scoped-elements/material-web'

import { ResourceSpecificationsResponse, ReadAllResourceSpecifications, ResourceSpecificationEdge, ResourceSpecification } from './queries'
import { CreateResourceSpecification, ResourceSpecificationCreateResponse } from './mutations'

export class InputWorkType extends ScopedElementsMixin(LitElement)
{
  @property()
  label?: string

  @property()
  placeholder?: string

  @property()
  value?: string

  @property()
  change?: (e: Event) => void

  @state()
  showSelectionUI: boolean = false

  @state()
  showCreationUI: boolean = false

  @state()
  searchValue?: string

  specifications: ApolloQueryController<ResourceSpecificationsResponse> = new ApolloQueryController(this, ReadAllResourceSpecifications)

  createSpecification: ApolloMutationController<ResourceSpecificationCreateResponse> = new ApolloMutationController(this, CreateResourceSpecification, {
    // prepend to readAll query when write request completes
    update: (cache, result) => {
      const existing = (cache.readQuery({
        query: ReadAllResourceSpecifications,
      }) as ResourceSpecificationsResponse)
      const resourceSpecs = existing.resourceSpecifications.edges
      const createdSpec = result.data?.createResourceSpecification.resourceSpecification

      cache.writeQuery({
        query: ReadAllResourceSpecifications,
        data: {
          resourceSpecifications: {
            pageInfo: existing.resourceSpecifications.pageInfo,
            edges: [{
              node: createdSpec,
            }].concat(resourceSpecs),
          },
        },
        overwrite: true,
      })

      // tell `specifications` query to refetch from cache; UI will update with additional selection
      this.specifications.subscribe({ fetchPolicy: 'cache-only' })
    },
  })

  @query('#autocomplete-input')
  input!: HTMLInputElement

  @query('#specification-note')
  noteInput!: HTMLInputElement

  async createNew(): Promise<void> {
    // perform the GraphQL mutation.
    // triggers cache update & refresh of `this.specifications`
    const newSpec = (await this.createSpecification.mutate({
      variables: { resourceSpecification: {
        name: this.input.value,
        note: this.noteInput.value,
      } },
    }) as { data: ResourceSpecificationCreateResponse }).data
      .createResourceSpecification
      .resourceSpecification

    // hide the creation UI
    this.showCreationUI = false

    // force-update UI to match selection
    this.value = newSpec.id
    this.searchValue = newSpec.name

    // trigger change event callback
    this.notifyChanged(newSpec)
  }

  async onChooseItem(e: CustomEvent) {
    const specs = this.specifications.data?.resourceSpecifications.edges || []
    const matchingSpec = specs[e.detail.index]

    // hide the autocomplete list
    this.showSelectionUI = false

    // force-update UI to match selection
    this.value = matchingSpec.node.id
    this.searchValue = matchingSpec.node.name

    // trigger change event callback
    this.notifyChanged(matchingSpec.node)
  }

  notifyChanged(rs: ResourceSpecification) {
    this.dispatchEvent(new CustomEvent('change', {
      detail: {
        value: rs.id,
        resourceSpecification: rs,
      },
      bubbles: true,
      composed: true,
    }))
  }

  async onFocus(_e: Event) {
    this.showSelectionUI = true
  }

  async onBlur(e: Event) {
    this.searchValue = this.input?.value

    // on clicking outside of the component, hide UI panels
    // @ts-ignore
    if (!this.shadowRoot.contains(e.relatedTarget)) {
      this.showSelectionUI = false
      this.showCreationUI = false
    }
  }

  async onChange(_e: Event) {
    this.searchValue = this.input?.value
  }

  async onKeyup(e: KeyboardEvent) {
    this.searchValue = this.input?.value

    // jump to creation if no selection on enter or tab
    const keycode = e.key
    if (keycode === "Enter" || keycode === "Tab") {
      this.showCreationUI = true
      this.showSelectionUI = false
      setTimeout(() => this.noteInput.focus(), 0)
    } else {
    // upon any change to input, go back to search mode
      this.showCreationUI = false
      this.showSelectionUI = true
    }
  }

  // on clicking existing value, edit selection
  async onResetSelection(e: MouseEvent) {
    this.resetSelection()
  }

  // on enter / escape keypress to existing value, edit selection
  async onResetKeypress(e: KeyboardEvent) {
    const keycode = e.key
    if (keycode === "Enter" || keycode === "Escape") {
      this.resetSelection()
    }
  }

  resetSelection() {
    this.searchValue = undefined
    this.value = undefined
    // focus on text field to await new input
    setTimeout(() => this.input.focus(), 0)
  }

  // filter predicate for finding matched ResourceSpecification
  isSelectedSpecification({ node }: ResourceSpecificationEdge) {
    return node.id === this.value
  }

  // filter predicate for subsetting ResourceSpecifications list
  // :TODO: implement a useful ordering method & better search/filtering method
  specificationMatches({ node }: ResourceSpecificationEdge) {
    // no active search means they all match
    if (!this.searchValue || !this.searchValue.length) {
      return true
    }
    return node.name.match(this.searchValue as string)
  }

  render() {
    if (this.specifications.loading) {
      return html`<loading-message>Fetching work types...</loading-message>`
    }

    if (this.specifications.error) {
      return html`
        <error-display .error=${this.specifications.error}>
          <p slot="message">Problem loading work types. Please try again.</p>
        </error-display>
      `
    }

    if (this.specifications.data) {
      const specs = this.specifications.data.resourceSpecifications.edges
      const selectedSpec = (specs.find(this.isSelectedSpecification.bind(this)) || {}).node
      const matchingSpecs = specs.filter(this.specificationMatches.bind(this))

      return html`
        <div class="autocomplete-wrap" @blur=${this.onBlur}>

          <div class="input">

          ${// show render of selected ResourceSpecification if a valid value is selected
            // :TODO: render ResourceSpecification images
          selectedSpec ? html`
            <section class="specification" @click=${this.onResetSelection} @keyUp=${this.onResetKeypress}>
              <h3>${selectedSpec.name}</h3>
              <p>${selectedSpec.note}</p>
            </section>
          ` : html``}

          ${/* input field for rendering of main autocomplete control */html``}
            <mwc-textfield
              id="autocomplete-input"
              class="defaultInvisible ${!selectedSpec ? "active" : ""}"
              label=${this.label}
              placeholder=${this.placeholder}
              value=${this.searchValue || ''}
              @change=${this.onChange}
              @keyup=${this.onKeyup}
              @focus=${this.onFocus}
              @blur=${this.onBlur}
            ></mwc-textfield>

          ${/* show other fields for creation of ResourceSpecification if input is not available in selection UI */html``}
            <div class="popup inputInner defaultInvisible ${this.showCreationUI ? "active" : ""}">
              <mwc-textarea
                id="specification-note"
                placeholder="Please describe this type of work to help others (and your future self) understand it."
                rows="4"
              ></mwc-textarea>
              <mwc-button
                label="Create new work type"
                @click="${this.createNew}"
              ></mwc-button>
            </div>

          </div>

          ${// conditionally render autocomplete popup with selected values
          this.showSelectionUI ? html`
            <div class="popup">
              <mwc-list @selected=${this.onChooseItem}>
                ${matchingSpecs.map(({ node }) => html`
                  <mwc-list-item
                    value=${node.id}
                    ${node.id === this.value ? `selected` : ``}
                    twoline
                  >
                    <span>${node.name}</span>
                    <span slot="secondary">${node.note}</span>
                  </mwc-list-item>
                `)}
              </mwc-list>
            </div>
          ` : ``}

        </div>
      `
    }
    return null
  }

  static styles = css`
    :host {
      display: inline-flex;
    }
    .autocomplete-wrap {
      position: relative;
    }
    .popup {
      position: absolute;
      top: 100%;
      left: 0;
      width: 100%;
      z-index: 1;
      max-height: 50vh;
      background: var(--nh-specification-input-bg-color);
      padding: 0.2em;
      margin-top: -0.2em;
      border-bottom-left-radius: 0.2em;
      border-bottom-right-radius: 0.2em;
    }
    .input {
      padding: 0.2em;
      border-radius: 0.2em;
      background: var(--nh-specification-input-bg-color);
    }
    /* visually attach new ResourceSpecification input fields to originating .input */
    .popup.inputInner {
      padding: 0.2em;
      border-radius: 0.2em;
      margin: -0.2em;
      background: var(--nh-specification-input-bg-color);
    }
    .specification {
      cursor: pointer;
      line-height: 1.5em;
    }
    .specification h3 {
      font-size: 1em;
      color: var(--nh-applet-primary-text-color);
    }
    .specification p {
      font-size: 0.8em;
      color: var(--nh-applet-secondary-text-color);
    }

    .defaultInvisible {
      display: none;
    }
    .active {
      display: block;
    }
  `

  static get scopedElements() {
    return {
      'loading-message': LoadingMessage,
      'error-display': ErrorDisplay,
      'mwc-textfield': TextField,
      'mwc-list': List,
      'mwc-list-item': ListItem,
      'mwc-textarea': TextArea,
      'mwc-button': Button,
    }
  }
}
