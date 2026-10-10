import { MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";

export const useDndSensors = () =>
  useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 8,
      },
    })
  );
