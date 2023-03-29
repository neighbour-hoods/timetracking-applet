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

import { ResourceSpecificationsResponse, ReadAllResourceSpecifications, ResourceSpecificationEdge, ResourceSpecification } from './queries'
import { CreateResourceSpecification, ResourceSpecificationCreateResponse } from './mutations'

import '@shoelace-style/shoelace/dist/components/button/button.js'
import '@shoelace-style/shoelace/dist/components/icon/icon.js'
import '@shoelace-style/shoelace/dist/components/input/input.js'
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js'
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js'
import '@shoelace-style/shoelace/dist/components/menu/menu.js'
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js'

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
    const matchingSpec = specs.find(({ node }) => node.id === e.detail.item.value)
    if (!matchingSpec) return

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
    if (!this.shadowRoot.contains(e.target)) {
      this.showSelectionUI = false
      this.showCreationUI = false
    }
  }

  async onChange(_e: Event) {
    this.searchValue = this.input?.value

    // upon any change to input, go back to search mode
    this.showCreationUI = false
    this.showSelectionUI = true
  }

  async onKeyUp(e: KeyboardEvent) {
    if (this.cancelCreationOnEscKeypress(e)) {
      return
    }

    // update search string and show matches upon updating value
    this.searchValue = this.input?.value
    this.showSelectionUI = true

    if (e.key !== "Enter" && e.key !== "Tab") {
      return
    }

    // jump to creation input if no selection
    this.showCreationUI = true
    this.showSelectionUI = false
    setTimeout(() => this.noteInput.focus(), 0)
  }

  cancelCreationOnEscKeypress(e: KeyboardEvent) {
    if (e.key === "Escape") {
      this.showCreationUI = false
      return true
    }
    return false
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
      <sl-dropdown ?open=${this.showSelectionUI} @sl-select=${this.onChooseItem} @sl-hide=${this.onBlur} @blur=${this.onBlur}>
        <div slot="trigger">

        ${// show render of selected ResourceSpecification if a valid value is selected
          // :TODO: render ResourceSpecification images
        selectedSpec ? html`
          <section class="specification" @click=${this.onResetSelection} @keyUp=${this.onResetKeypress}>
            <p>${selectedSpec.name}</p>
          </section>
        ` :
        // render main autocomplete control if no valid selection is made
        html`
          <div class="input">
            <sl-input
              id="autocomplete-input"
              label=${this.label}
              placeholder=${this.placeholder}
              value=${this.searchValue || ''}
              @sl-input=${this.onChange}
              @sl-focus=${this.onFocus}
              @sl-blur=${this.onBlur}
              @keyup=${this.onKeyUp}
            ></sl-input>
            <aside>
              ${this.showSelectionUI ? html`(or <sl-icon name="arrow-return-left"></sl-icon> to create a new one)` : ""}
            </aside>
            <sl-icon class="autocomplete-icon" name="tag"></sl-icon>

            ${// show other fields for creation of ResourceSpecification if triggered
            this.showCreationUI ? html`
              <div class="popup">
                <sl-textarea
                  id="specification-note"
                  help-text="Please describe this type of work to help others (and your future self) understand it."
                  rows="4"
                  @keyup=${this.cancelCreationOnEscKeypress}
                ></sl-textarea>
                <p><sl-button @click="${this.createNew}">Create new work type</sl-button></p>
              </div>
            ` : html``}
          `}
          </div>
        </div>
        ${// show menu of options if current form value matches any
        matchingSpecs.length ? html`
          <sl-menu>
            ${matchingSpecs.map(({ node }) => html`
              <sl-menu-item
                value=${node.id}
                ?selected=${node.id === this.value}
              >
                ${node.name}
                <aside>${node.note}</aside>
              </sl-menu-item>
            `)}
          </sl-menu>
        ` : html``}
      </sl-dropdown>`
    }
    return null
  }

  static styles = css`
    :host, sl-dropdown, .specification {
      display: block;
    }

    .input {
      position: relative;
      overflow: visible;
    }

    .popup {
      background: var(--nh-specification-input-bg-color);
      position: absolute;
      z-index: 1;
      left: 0;
      line-height: 1;
    }

    #autocomplete-input::part(input) {
      padding-right: 1.2em;
    }
    .autocomplete-icon {
      position: absolute;
      right: 0.5em;
      top: 0.3em; /* :SHONK: workaround for inline-flex positioning in Shoelace UI controls interfering with layout */
      height: var(--sl-input-height-medium);
    }

    .specification {
      padding: 0 var(--sl-input-spacing-medium);
      font-size: var(--sl-input-font-size-medium);
      line-height: var(--sl-input-height-medium);
      height: calc(var(--sl-input-height-medium) - var(--sl-input-border-width) * 2);
      border-radius: var(--sl-input-border-radius-medium);
      border: solid var(--sl-input-border-width) var(--sl-input-border-color);
      background-color: var(--sl-input-background-color);
      cursor: pointer;
      margin-top: 0.3em; /* :SHONK: workaround for inline-flex positioning in Shoelace UI controls interfering with layout */
    }
    .specification p {
      margin: 0;
      font-size: var(--sl-font-size-medium);
      color: var(--nh-applet-primary-text-color);
    }

    aside {
      font-size: 0.6em;
      line-height: 1;
      padding-top: 0.2em;
      color: var(--nh-applet-secondary-text-color);
    }
  `

  static get scopedElements() {
    return {
      'loading-message': LoadingMessage,
      'error-display': ErrorDisplay,
    }
  }
}
