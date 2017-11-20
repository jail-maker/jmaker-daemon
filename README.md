# jmaker-daemon
## requirements:

- node >= v9.1
- `npm` or `yarn`
- [check_ip](https://github.com/jail-maker/check_ip) -
for automatically getting ip addresses

tune in /boot/loader.conf:
```
kern.racct.enable=1
ng_ether_load="YES"
```
