# FACoP Reference E-commerce

This intentionally small domain demonstrates FullAgenticCollab rather than production commerce modeling.

Entities:

- **Users** — create and deactivate an identity.
- **Consumers** — bind a buyer profile to a User.
- **Products** — create products and change price.
- **Stock** — add inventory, reserve it, release failed reservations and commit successful reservations.
- **Payment** — create, authorize, capture, cancel-before-capture and refund-after-capture.
- **Delivery** — create a delivery and advance/cancel its status.

Every atomic behavior lives under `actions/<Entity>/<action>/` and contains human explanation, external manifest, internal config, typed input/output schema, events, implementation and a unit test.

Project-owned integration/E2E/security suites live at repository `tests/`; a contributor therefore cannot satisfy upstream acceptance solely by modifying an action's own tests.

The checkout reference flow is `reserve stock → create payment → authorize → create delivery → capture → commit stock`. Failures before completion compensate owned resources by cancelling/refunding payment as appropriate, cancelling a created delivery and releasing any still-reserved stock.
