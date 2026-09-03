# FACoP Reference E-commerce

This intentionally small domain demonstrates FullAgenticCollab rather than production commerce modeling.

Entities:

- **Users** — create and deactivate an identity.
- **Consumers** — bind a buyer profile to a User.
- **Products** — create products and change price.
- **Stock** — add, reserve and release quantities.
- **Payment** — create, authorize, capture and refund payments.
- **Delivery** — create a delivery and advance its status.

Every atomic behavior lives under `actions/<Entity>/<action>/` and contains human explanation, external manifest, internal config, typed input/output schema, events, implementation and a unit test.

Project-owned integration/E2E/security suites live at repository `tests/`; a contributor therefore cannot satisfy upstream acceptance solely by modifying an action's own tests.
