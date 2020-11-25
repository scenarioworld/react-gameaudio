/* eslint-disable @typescript-eslint/consistent-type-assertions*/

interface ConstructorMock<InstanceType> {
  /** Instances created by this constructor */
  instances: InstanceType[];

  /** Constructor to create new instances */
  constructor: () => InstanceType;
}

/**
 * Creates a constructor mock, which includes both a constructor and a list of instances created by the constructor
 * @param _instStub stub to deduce instance type. Set it to <InstanceType>_stub for some type
 * @param fn returns a new instance that partially fulfills InstanceType
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createConstructorMock<
  InstanceType,
  MockType extends Partial<InstanceType>
>(_instStub: InstanceType, fn: () => MockType): ConstructorMock<MockType> {
  const instances: MockType[] = [];
  return {
    instances,
    constructor: jest.fn(() => {
      const instance = fn();
      instances.push(instance);
      return instance;
    }),
  };
}

/** Used to stub in createConstructorMock */
export const _stub = <unknown>null;
