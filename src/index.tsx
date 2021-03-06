import * as React from "react";

export interface Component {
  type: string;
  props: object;
}

interface ComponentLookupProps {
  componentType: string;
  componentIndex: number;
  propIndex?: number;
}

export interface ComponentLookup {
  props: ComponentLookupProps;
}

export interface ReactFromJSONProps<
  MappingType = object,
  ComponentsType = object
> {
  components?: ComponentsType;
  entry: Component;
  mapping: MappingType;
}

/*
 * Walk a component tree and recursively render it.
 */
class ReactFromJSON<
  MappingType = object,
  ComponentsType = object
> extends React.Component<ReactFromJSONProps<MappingType, ComponentsType>> {
  public counter = {};

  public internalMapping: object = {};

  constructor(props: any) {
    super(props);

    this.internalMapping = {
      ComponentLookup: this.ComponentLookup
    };
  }

  ComponentLookup = ({
    componentIndex,
    componentType,
    propIndex
  }: ComponentLookupProps) => {
    const { components } = this.props;

    if (!components) {
      throw "Detected `ComponentLookup` prop on a component, but `components` is undefined. You need to define `components` if using `ComponentLookup` props.";
    }

    if (!components[componentType]) {
      throw `Detected \`${componentType}\` ComponentLookup, but it's not defined in your \`components\` object.`;
    }

    const component = components[componentType][componentIndex];

    return this.renderComponent({
      ...component,
      props: {
        id: component.id || componentIndex, // Map id to component props if specified on root. Otherwise, use index.
        propIndex: propIndex,
        ...component.props
      }
    });
  };

  resolveProp = (prop: any, index?: number): any => {
    if (prop === null) {
      return prop;
    } else if (Array.isArray(prop)) {
      return prop.map(this.resolveProp);
    } else if (typeof prop === "object") {
      if (
        // Typeguard
        prop["type"] !== undefined &&
        prop["props"] !== undefined
      ) {
        const component: Component = prop;

        return this.renderComponent(component, index);
      }
    }

    return prop;
  };

  getNextKey(type: string, propIndex?: number) {
    this.counter[type] = this.counter[type] || 0;
    const propIndexKey =
      typeof propIndex !== "undefined" ? `_${propIndex}` : "";
    return `${type}_${this.counter[type]++}${propIndexKey}`;
  }

  renderComponent(component: Component, propIndex?: number) {
    const { mapping } = this.props;
    const { type, props } = component;
    const resolvedProps = {};
    const key = this.getNextKey(type, propIndex);

    const propKeys = Object.keys(props);

    for (let index = 0; index < propKeys.length; index++) {
      const propKey = propKeys[index];
      const prop = props[propKey];

      resolvedProps[propKey] = this.resolveProp(prop);
    }

    const MappedComponent = this.internalMapping[type] || mapping[type];

    if (typeof MappedComponent === "undefined") {
      throw `Tried to render the "${type}" component, but it's not specified in your mapping.`;
    }

    return (
      <MappedComponent key={key} propIndex={propIndex} {...resolvedProps} />
    );
  }

  render() {
    const { entry } = this.props;

    return <>{this.renderComponent(entry)}</>;
  }
}

export default ReactFromJSON;
