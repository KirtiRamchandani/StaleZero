# StaleZero vs Redux

Redux gives applications state update primitives. StaleZero does not replace reducers, stores, selectors, or RTK Query.

StaleZero helps when a mutation affects Redux and several non-Redux systems at the same time. The Redux adapter dispatches a clear action payload from the same receipt that tracks every other target.
