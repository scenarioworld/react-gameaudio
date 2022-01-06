import { AudioGraph } from './graph';
import { AudioEvent, EventDefSet, Variables } from './json';

function evaluateAudioCondition(
  condition: string,
  variables?: Variables
): boolean {
  const names = variables ? Object.keys(variables) : [];

  // Create a function which takes all the variable sets its arguments
  // eslint-disable-next-line no-new-func
  const func = new Function(
    'window',
    'alert',
    'prompt',
    ...(names ?? []),
    `"use strict"; return ${condition};`
  );

  // Call function
  let result = false;
  try {
    result = func.call(
      undefined,
      undefined,
      undefined,
      undefined,
      ...names.map(n => variables?.[n])
    );
  } catch (e) {
    console.error(`Failed to run script '${condition}'.`, e);
    return false;
  }

  if (typeof result === 'boolean') {
    return result;
  }

  console.warn(
    `Condition '${condition}' did not return a boolean, but a ${typeof result}.`
  );
  return false;
}

export class EventManager {
  /**
   * Creates a new event manager
   * @param definitions Event definitions
   * @param graph Graph to forward SFX calls to
   */
  constructor(private definitions: EventDefSet, private graph: AudioGraph) {}

  /**
   * Execute event by name
   * @param name Event name
   * @param variables Current variable values
   */
  public execute(name: string, variables?: Variables): void {
    // Forward to execution function
    this.executeEvent(name, variables);
  }

  private executeEvent(event: AudioEvent, variables?: Variables) {
    if (typeof event === 'string') {
      // Check if it's an audio event. If so, run it
      if (event in this.definitions) {
        this.executeEvent(this.definitions[event], variables);
      } else {
        // Otherwise, it's a SFX. Play it through the graph
        this.graph.playsfx(event);
        return;
      }
    } else if (Array.isArray(event)) {
      event.forEach(e => this.executeEvent(e, variables));
    } else if ('shuffle' in event) {
      // Run random event
      this.executeEvent(
        event.shuffle[Math.floor(Math.random() * event.shuffle.length)],
        variables
      );
    } else if ('select' in event) {
      // Run all passing conditions
      const passingConditions = Object.keys(event.select).filter(cond =>
        evaluateAudioCondition(cond, variables)
      );
      for (const cond of passingConditions) {
        this.executeEvent(event.select[cond]);
      }
    }
  }
}
