import $dev from "@/helpers/Dev";
import $appdata from "@/helpers/AppData";

const pending: Array<{ data: any; callback: (...args: any[]) => void }> = [];
let active: { data: any; callback: (...args: any[]) => void } | null = null;

const helper: Record<string, any> = {
  show(data, callback: (...args: any[]) => void = function () {}) {
    pending.push({ data: this.getData(data), callback });
    this.showNext();
  },
  showNext() {
    if (active || !pending.length) return;
    active = pending.shift();
    const { data } = active;

    $dev.write("dialog", data, typeof data, Array.isArray(data));

    $appdata.set("alert.value", "");
    $appdata.set("alert.show", true);
    $appdata.set("alert.title", data.title || null);
    $appdata.set("alert.text", data.text || null);
    $appdata.set("alert.error", data.error || null);
    $appdata.set("alert.color", data.color || "");
    $appdata.set(
      "alert.translate",
      data.translate == null || data.translate == undefined
        ? true
        : data.translate,
    );
    $appdata.set(
      "alert.buttons",
      data.buttons || [{ text: "alert.close", color: "error", value: "close" }],
    );

  },
  respond(value) {
    if (!active) return;
    const completed = active;
    $appdata.set("alert.value", value);
    $appdata.set("alert.show", false);
    try {
      completed.callback(value);
    } finally {
      active = null;
      this.showNext();
    }
  },

  yesno(data, callback: (...args: any[]) => void = function () {}) {
    data = this.getData(data);

    this.show(
      {
        ...data,
        buttons: [
          { text: "alert.no", color: "error", value: "no" },
          { text: "alert.yes", color: "info", value: "yes" },
        ],
      },
      (resp, ret) => {
        callback(resp, ret);
      },
    );
  },

  info(data, callback: (...args: any[]) => void = function () {}) {
    data = this.getData(data);

    this.show(
      {
        ...data,
        buttons: [{ text: "alert.close", color: "error", value: "close" }],
      },
      (resp, ret) => {
        callback(resp, ret);
      },
    );
  },

  error(data, callback: (...args: any[]) => void = function () {}) {
    data = this.getData(data);

    this.show(
      {
        ...data,
        buttons: [{ text: "alert.close", color: "error", value: "close" }],
      },
      (resp, ret) => {
        callback(resp, ret);
      },
    );
  },

  getData(data) {
    if (typeof data === "string") {
      data = { text: data };
    } else if (Array.isArray(data)) {
      data = {
        title: data[0] ?? null,
        text: data[1] ?? null,
      };
    }

    return data;
  },
};

export default helper;
