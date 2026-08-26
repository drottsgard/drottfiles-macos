import { readFileSync, writeFileSync } from "node:fs";
import type { ExtensionAPI, Skill } from "@earendil-works/pi-coding-agent";
import { getSettingsListTheme } from "@earendil-works/pi-coding-agent";
import { Container, type SettingItem, SettingsList, Text } from "@earendil-works/pi-tui";

function setSkillEnabled(skill: Skill, enabled: boolean): boolean {
  const content = readFileSync(skill.filePath, "utf8");
  const frontmatter = content.match(
    /^(\uFEFF?---[^\S\r\n]*\r?\n)([\s\S]*?)(\r?\n---[^\S\r\n]*(?:\r?\n|$))/,
  );

  if (!frontmatter || frontmatter.index === undefined) {
    throw new Error("SKILL.md does not have a YAML frontmatter block");
  }

  const body = frontmatter[2];
  const fieldPattern = /^disable-model-invocation[ \t]*:[^\r\n]*/gm;
  const fields = body.match(fieldPattern) ?? [];
  if (fields.length > 1) {
    throw new Error("SKILL.md has duplicate disable-model-invocation fields");
  }

  const value = enabled ? "false" : "true";
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const nextBody =
    fields.length === 1
      ? body.replace(fieldPattern, `disable-model-invocation: ${value}`)
      : `${body}${eol}disable-model-invocation: ${value}`;
  const start = frontmatter.index;
  const end = start + frontmatter[0].length;
  const nextContent =
    content.slice(0, start) + frontmatter[1] + nextBody + frontmatter[3] + content.slice(end);

  if (nextContent === content) return false;
  writeFileSync(skill.filePath, nextContent, "utf8");
  return true;
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("pi-skill-toggle", {
    description: "Turn skill model invocation on or off",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") {
        ctx.ui.notify("/skills requires TUI mode", "error");
        return;
      }

      const skills = ctx.getSystemPromptOptions().skills ?? [];
      if (skills.length === 0) {
        ctx.ui.notify("No skills are loaded", "info");
        return;
      }

      let changed = false;
      await ctx.ui.custom((tui, theme, _keybindings, done) => {
        const items: SettingItem[] = skills.map((skill) => ({
          id: skill.filePath,
          label: skill.name,
          description: skill.disableModelInvocation
            ? `Off: available only through /skill:${skill.name}`
            : "On: advertised to the model in the system prompt",
          currentValue: skill.disableModelInvocation ? "off" : "on",
          values: ["on", "off"],
        }));
        const skillsByPath = new Map(skills.map((skill) => [skill.filePath, skill]));
        const container = new Container();
        container.addChild(
          new Text(theme.fg("accent", theme.bold("Skill Model Invocation")), 1, 1),
        );

        const settingsList = new SettingsList(
          items,
          Math.min(items.length + 2, 15),
          getSettingsListTheme(),
          (id, newValue) => {
            const skill = skillsByPath.get(id);
            if (!skill) return;

            const previousValue = skill.disableModelInvocation ? "off" : "on";
            try {
              if (setSkillEnabled(skill, newValue === "on")) changed = true;
              skill.disableModelInvocation = newValue === "off";
            } catch (error) {
              settingsList.updateValue(id, previousValue);
              const message = error instanceof Error ? error.message : String(error);
              ctx.ui.notify(`Could not update ${skill.name}: ${message}`, "error");
            }
          },
          () => done(undefined),
          { enableSearch: true },
        );
        container.addChild(settingsList);

        return {
          render: (width: number) => container.render(width),
          invalidate: () => container.invalidate(),
          handleInput: (data: string) => {
            settingsList.handleInput(data);
            tui.requestRender();
          },
        };
      });

      if (changed) {
        ctx.ui.notify("Skill settings saved; reloading pi resources", "info");
        await ctx.reload();
        return;
      }
    },
  });
}
