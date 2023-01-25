import { contextProvided } from "@lit-labs/context";
import { property } from "lit/decorators.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement, html, css } from "lit";
import { hreaGraphQLContext } from "../contexts";
import { GraphQLClientProvider } from "../provider-graphql-client";

export class ProviderComponent extends ScopedElementsMixin(LitElement) {
    @contextProvided({ context: hreaGraphQLContext, subscribe: true })
    @property({attribute: false})
    public  graphql!: GraphQLClientProvider

    
    render() {
        return html`
            <div>
                <p1>this is a provider component!</p1>
            </div>
        `
    }
    
    static get scopedElements() {
        return {
        };
    }
}