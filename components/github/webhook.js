const github = require("https://github.com/PipedreamHQ/pipedream/components/github.js")

module.exports = {
  name: "github-webhook",
  version: "0.0.1",
  props: {
    db: "$.service.db",
    http: "$.interface.http",
    github,
    repoFullName: {
      propDefinition: [github, "repoFullName"],
    },
    events: { propDefinition: [github, "events"] },
  },
  methods: {
    generateSecret() {
      return ""+Math.random()
    },
  },
  hooks: {
    async activate() {
      const secret = this.generateSecret()
      const { id } = await this.github.createHook({
        repoFullName: this.repoFullName,
        endpoint: this.http.endpoint,
        events: this.events,
        secret,
      })
      this.db.set("hookId", id)
      this.db.set("secret", secret)
    },
    async deactivate() {
      await this.github.deleteHook({
        repoFullName: this.repoFullName,
        hookId: this.db.get("hookId"),
      })
    },
  },
  async run(event) {
    // have to be careful about where this event came from to respond
    this.http.respond({
      status: 200,
    })
    const { body, headers } = event
    if (headers["X-Hub-Signature"]) {
      const crypto = require("crypto")
      const algo = "sha1"
      const hmac = crypto.createHmac(algo, this.db.get("secret"))
      hmac.update(body, "utf-8")
      if (headers["X-Hub-Signature"] !== `${algo}=${hmac.digest("hex")}`) {
        throw new Error("signature mismatch")
      }
    }
    this.$emit(body)
  },
}